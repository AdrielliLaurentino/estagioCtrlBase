export const gerarPdfAvaliacaoFisica = ({
  avaliacao,
  avaliacaoAnterior,
  dadosNegocio,
  usuarioLogado,
  logoUrl
}) => {
  const formatarData = (isoDate) => {
    if (!isoDate) return "--/--/----";
    return new Date(isoDate).toLocaleDateString("pt-BR");
  };

  const formatarNumero = (valor, sufixo = "") => {
    if (valor === null || valor === undefined || isNaN(valor)) return "--";
    return `${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sufixo}`.trim();
  };

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return "--";
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  const nomeUnidade = dadosNegocio?.nomeFantasia || "CtrlBase Academia";
  const enderecoUnidade = `${dadosNegocio?.logradouro || ""}, ${dadosNegocio?.numero || ""} - ${dadosNegocio?.cidade || ""} / ${dadosNegocio?.uf || ""}`;
  const dataHoje = new Date();
  const dataAvaliacao = formatarData(avaliacao.dataAvaliacao);
  const proximaAvaliacao = new Date(dataHoje);
  proximaAvaliacao.setDate(dataHoje.getDate() + 90);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Avaliação Física - ${avaliacao.nomeCliente || "Aluno"}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
        
        @page { size: A4 portrait; margin: 1.5cm; }
        
        body {
          font-family: 'Inter', sans-serif;
          color: #111827;
          margin: 0;
          padding: 0;
          font-size: 10px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* TIPOGRAFIA & UTILITÁRIOS */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .uppercase { text-transform: uppercase; }
        .font-black { font-weight: 900; }
        .font-bold { font-weight: 600; }
        .text-gray { color: #6B7280; }
        
        /* HEADER DO DOCUMENTO */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #E5E7EB;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header img { max-height: 40px; }
        .header .gym-info { text-align: right; }
        .header .gym-info h2 { margin: 0; font-size: 14px; font-weight: 900; letter-spacing: -0.5px; }
        .header .gym-info p { margin: 2px 0 0 0; color: #6B7280; font-size: 9px; }

        /* IDENTIFICAÇÃO DO ALUNO */
        .patient-card {
          background-color: #F9FAFB;
          border-radius: 8px;
          padding: 12px 16px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
          border: 1px solid #E5E7EB;
        }
        .patient-card div p.label { margin: 0 0 2px 0; font-size: 8px; color: #6B7280; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
        .patient-card div p.value { margin: 0; font-size: 11px; font-weight: 800; }

        /* RESUMO DE COMPOSIÇÃO CORPORAL */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .summary-box {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .summary-box .label { font-size: 8px; color: #6B7280; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px; }
        .summary-box .value { font-size: 18px; font-weight: 900; margin: 0; }
        .summary-box.highlight { background-color: #111827; color: #FFFFFF; border-color: #111827; }
        .summary-box.highlight .label { color: #9CA3AF; }

        /* GRID PRINCIPAL (DUAS COLUNAS) */
        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        /* TABELAS MINIMALISTAS */
        .section-title {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          border-bottom: 1px solid #111827;
          padding-bottom: 4px;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          padding: 6px 4px;
          border-bottom: 1px solid #E5E7EB;
          text-align: left;
          font-size: 9px;
        }
        th {
          font-weight: 800;
          color: #6B7280;
          text-transform: uppercase;
        }
        td.val-col { text-align: right; font-weight: 600; tabular-nums; }

        /* CAIXAS DE TEXTO (ANAMNESE/METAS) */
        .text-box {
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 10px;
          font-size: 9px;
          color: #374151;
          margin-bottom: 16px;
          min-height: 40px;
        }
      </style>
    </head>
    <body>

      <!-- HEADER -->
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : `<h2 class="uppercase font-black" style="font-size: 16px; margin: 0;">CTRLBASE</h2>`}
        <div class="gym-info">
          <h2 class="uppercase">${nomeUnidade}</h2>
          <p>${enderecoUnidade}</p>
          <p>Impresso em: ${dataHoje.toLocaleDateString('pt-BR')} às ${dataHoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <!-- CARTÃO DO ALUNO -->
      <div class="patient-card">
        <div style="grid-column: span 2;">
          <p class="label">Aluno(a)</p>
          <p class="value uppercase">${avaliacao.nomeCliente || "Não Informado"}</p>
        </div>
        <div>
          <p class="label">Idade / Sexo</p>
          <p class="value">${calcularIdade(avaliacao.dataNascimento)} anos / ${avaliacao.referencialCalculo === 'FEMININO' ? 'Fem' : 'Masc'}</p>
        </div>
        <div>
          <p class="label">Avaliador</p>
          <p class="value uppercase">${avaliacao.nomeAvaliador || usuarioLogado?.nome || "Sistema"}</p>
        </div>
        <div>
          <p class="label">Data da Avaliação</p>
          <p class="value">${dataAvaliacao}</p>
        </div>
        <div>
          <p class="label">Reavaliação Prevista</p>
          <p class="value">${formatarData(proximaAvaliacao)}</p>
        </div>
        <div style="grid-column: span 2;">
          <p class="label">Objetivo Principal</p>
          <p class="value uppercase">${avaliacao.objetivoPrincipal || "Nenhum informado"}</p>
        </div>
      </div>

      <!-- DESTAQUES NUMÉRICOS -->
      <div class="summary-grid">
        <div class="summary-box">
          <p class="label">Peso Total</p>
          <p class="value">${formatarNumero(avaliacao.peso, "kg")}</p>
        </div>
        <div class="summary-box">
          <p class="label">Massa Magra Estimada</p>
          <p class="value">${formatarNumero(avaliacao.massaMagra, "kg")}</p>
        </div>
        <div class="summary-box highlight">
          <p class="label">% de Gordura</p>
          <p class="value">${formatarNumero(avaliacao.percentualGordura, "%")}</p>
        </div>
      </div>

      <div class="main-grid">
        
        <!-- COLUNA ESQUERDA -->
        <div>
          <div class="section-title">Circunferências & Perímetros</div>
          <table>
            <thead>
              <tr>
                <th>Medida (cm)</th>
                <th class="val-col">Atual</th>
                <th class="val-col">Anterior</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Tórax</td><td class="val-col">${formatarNumero(avaliacao.medidas?.torax)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.torax)}</td></tr>
              <tr><td>Cintura</td><td class="val-col">${formatarNumero(avaliacao.medidas?.cintura)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.cintura)}</td></tr>
              <tr><td>Abdômen[cite: 7]</td><td class="val-col">${formatarNumero(avaliacao.medidas?.abdomen)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.abdomen)}</td></tr>
              <tr><td>Quadril[cite: 7]</td><td class="val-col">${formatarNumero(avaliacao.medidas?.quadril)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.quadril)}</td></tr>
              <tr><td>Braço Dir. Cont.[cite: 7]</td><td class="val-col">${formatarNumero(avaliacao.medidas?.bracoDireito)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.bracoDireito)}</td></tr>
              <tr><td>Braço Esq. Cont.[cite: 7]</td><td class="val-col">${formatarNumero(avaliacao.medidas?.bracoEsquerdo)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.bracoEsquerdo)}</td></tr>
              <tr><td>Coxa Direita[cite: 7]</td><td class="val-col">${formatarNumero(avaliacao.medidas?.coxaDireita)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.coxaDireita)}</td></tr>
              <tr><td>Coxa Esquerda[cite: 7]</td><td class="val-col">${formatarNumero(avaliacao.medidas?.coxaEsquerda)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.coxaEsquerda)}</td></tr>
              <tr><td>Panturrilha Dir.[cite: 7]</td><td class="val-col">${formatarNumero(avaliacao.medidas?.panturrilhaDireita)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.panturrilhaDireita)}</td></tr>
              <tr><td>Panturrilha Esq.[cite: 7]</td><td class="val-col">${formatarNumero(avaliacao.medidas?.panturrilhaEsquerda)}</td><td class="val-col">${formatarNumero(avaliacaoAnterior?.medidas?.panturrilhaEsquerda)}</td></tr>
            </tbody>
          </table>

          <div class="section-title mt-4">Dobras Cutâneas</div>
          <table>
            <thead>
              <tr>
                <th>Medida (mm)</th>
                <th class="val-col">Atual</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Peitoral</td><td class="val-col">${formatarNumero(avaliacao.dobras?.peitoral)}</td></tr>
              <tr><td>Subescapular</td><td class="val-col">${formatarNumero(avaliacao.dobras?.subescapular)}</td></tr>
              <tr><td>Tríceps</td><td class="val-col">${formatarNumero(avaliacao.dobras?.triceps)}</td></tr>
              <tr><td>Suprailíaca</td><td class="val-col">${formatarNumero(avaliacao.dobras?.suprailiaca)}</td></tr>
              <tr><td>Abdominal</td><td class="val-col">${formatarNumero(avaliacao.dobras?.abdominal)}</td></tr>
              <tr><td>Coxa</td><td class="val-col">${formatarNumero(avaliacao.dobras?.coxa)}</td></tr>
            </tbody>
          </table>
        </div>

        <!-- COLUNA DIREITA -->
        <div>
          <div class="section-title">Composição & Saúde</div>
          <div style="margin-bottom: 24px; padding: 12px; background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 9px; color: #6B7280; font-weight: 800; text-transform: uppercase;">Índice de Massa Corporal (IMC)</p>
            <p style="margin: 4px 0; font-size: 16px; font-weight: 900;">${formatarNumero(avaliacao.imc)}</p>
            <p style="margin: 0; font-size: 10px; font-weight: 700; color: #111827;">${avaliacao.classificacaoImc || "--"}</p>
          </div>

          <!-- Tabela Referência de IMC daCtrlBase (Inspirada no modelo de referência) -->
          <table style="font-size: 8px; color: #6B7280;">
            <tbody>
              <tr><td>Muito abaixo do peso[cite: 7]</td><td class="val-col">< 17.0</td></tr>
              <tr><td>Abaixo do peso[cite: 7]</td><td class="val-col">17.1 a 18.49</td></tr>
              <tr><td>Peso normal[cite: 7]</td><td class="val-col">18.6 a 24.99</td></tr>
              <tr><td>Acima do peso[cite: 7]</td><td class="val-col">25.1 a 29.99</td></tr>
              <tr><td>Obesidade I[cite: 7]</td><td class="val-col">30.1 a 34.99</td></tr>
              <tr><td>Obesidade II (Severa)[cite: 7]</td><td class="val-col">35.1 a 39.99</td></tr>
              <tr><td>Obesidade III (Mórbida)[cite: 7]</td><td class="val-col">> 40.0</td></tr>
            </tbody>
          </table>

          <div class="section-title" style="margin-top: 24px;">Anamnese / Histórico</div>
          <div class="text-box">
             ${avaliacao.anamnese?.historicoDoencas || "Nenhum histórico médico ou restrição reportados no momento da avaliação."}
          </div>

          <div class="section-title">Observações do Avaliador</div>
          <div class="text-box">
             ${avaliacao.observacoes || "Nenhuma observação adicional foi registrada nesta avaliação."}
          </div>
        </div>

      </div>
    </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(htmlContent);
  iframe.contentWindow.document.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 300);
};