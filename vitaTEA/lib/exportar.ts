import { Platform, Share } from "react-native";
import { buscarCsv } from "@/lib/api/relatorios";
import type { PeriodoRelatorio, Relatorio } from "@/lib/api/types";

export const ROTULO_PERIODO: Record<PeriodoRelatorio, string> = {
  "1h": "Última hora",
  "6h": "Últimas 6 horas",
  "24h": "Últimas 24 horas",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const numero = (valor: number | null, unidade = "") => (valor === null ? "--" : `${String(valor).replace(".", ",")}${unidade}`);

// Texto simples do relatório (usado no compartilhamento do celular).
export function relatorioEmTexto(relatorio: Relatorio, periodo: PeriodoRelatorio) {
  const linhas = [
    `VitaTEA - Relatório de ${relatorio.monitorado.nome}`,
    `${ROTULO_PERIODO[periodo]} (${dataHora(relatorio.periodo.desde)} a ${dataHora(relatorio.periodo.ate)})`,
    "",
  ];

  relatorio.sinais
    .filter((s) => s.total > 0)
    .forEach((s) => {
      linhas.push(
        `${s.nome}: média ${numero(s.media, ` ${s.unidade_medida}`)}, mín ${numero(s.minimo)}, máx ${numero(s.maximo)} ` +
          `(${s.total} leituras, ${numero(s.percentual_fora)}% fora dos limites)`,
      );
    });

  const n = relatorio.alertas.por_nivel;
  linhas.push("", `Alertas: ${relatorio.alertas.total} (críticos ${n.critico}, altos ${n.alto}, médios ${n.medio})`);
  return linhas.join("\n");
}

// Baixa o CSV no navegador ou abre o compartilhamento no celular.
export async function exportarCsv(id_monitorado: number, periodo: PeriodoRelatorio, nomeMonitorado: string) {
  const csv = await buscarCsv(id_monitorado, periodo);
  const nomeArquivo = `vitatea-${nomeMonitorado.replace(/\s+/g, "-").toLowerCase()}-${periodo}.csv`;

  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({ title: nomeArquivo, message: csv });
}

const escapar = (texto: string) =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// No navegador abre uma página de impressão limpa (fundo branco) para salvar como PDF.
// No celular compartilha o resumo em texto.
export async function imprimirRelatorio(relatorio: Relatorio, periodo: PeriodoRelatorio) {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    await Share.share({ message: relatorioEmTexto(relatorio, periodo) });
    return;
  }

  const linhasSinais = relatorio.sinais
    .map(
      (s) => `<tr>
        <td>${escapar(s.nome)}</td>
        <td>${s.total}</td>
        <td>${numero(s.media)}</td>
        <td>${numero(s.minimo)}</td>
        <td>${numero(s.maximo)}</td>
        <td>${s.unidade_medida}</td>
        <td>${s.limites ? `${s.limites.min} a ${s.limites.max}${s.limites.personalizado ? " (personalizado)" : ""}` : "--"}</td>
        <td>${numero(s.percentual_fora)}%</td>
      </tr>`,
    )
    .join("");

  const n = relatorio.alertas.por_nivel;
  const linhasAlertas = relatorio.alertas.recentes
    .map(
      (a) =>
        `<li><strong>${a.nivel_criticidade.toUpperCase()}</strong> - ${dataHora(a.data_hora)} - ${escapar(a.mensagem)}</li>`,
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>Relatório VitaTEA - ${escapar(relatorio.monitorado.nome)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px}
      h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 8px}
      p{margin:2px 0;color:#444;font-size:13px}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #bbb;padding:6px 8px;text-align:left} th{background:#f0f0f0}
      ul{font-size:12px;padding-left:18px} li{margin:3px 0}
      .nota{margin-top:24px;font-size:11px;color:#666}
    </style></head><body>
    <h1>Relatório de sinais vitais - ${escapar(relatorio.monitorado.nome)}</h1>
    <p>${relatorio.monitorado.idade} anos - TEA nível ${relatorio.monitorado.nivel_tea}</p>
    <p>${ROTULO_PERIODO[periodo]}: ${dataHora(relatorio.periodo.desde)} a ${dataHora(relatorio.periodo.ate)}</p>
    <p>Gerado em ${dataHora(relatorio.gerado_em)} - ${relatorio.total_leituras} leituras no período</p>
    <h2>Resumo por sinal</h2>
    <table><thead><tr><th>Sinal</th><th>Leituras</th><th>Média</th><th>Mín.</th><th>Máx.</th><th>Unidade</th><th>Limites</th><th>Fora dos limites</th></tr></thead>
    <tbody>${linhasSinais}</tbody></table>
    <h2>Alertas (${relatorio.alertas.total})</h2>
    <p>Críticos: ${n.critico} - Altos: ${n.alto} - Médios: ${n.medio} - Baixos: ${n.baixo}</p>
    <ul>${linhasAlertas || "<li>Nenhum alerta no período.</li>"}</ul>
    <p class="nota">Valores estimados por um protótipo de apoio ao cuidador; não substituem equipamentos médicos certificados nem a avaliação de um profissional de saúde.</p>
    <script>window.onload=function(){window.focus();window.print();}</script>
    </body></html>`;

  const janela = window.open("", "_blank");
  if (!janela) throw new Error("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}
