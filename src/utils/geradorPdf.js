export const gerarTemplateRelatorio = ({
  tituloRelatorio,
  periodo,
  resumoHtml,
  titulosTabela,
  linhasTabela,
  usuario,
  dadosNegocio
}) => {
  const nomeFantasia = dadosNegocio?.nomeFantasia || "PANOBIANCO CIANORTE";
  const cnpj = dadosNegocio?.documentoNumero || "47.637.482/0001-59";
  const endereco = dadosNegocio?.logradouro 
    ? `${dadosNegocio.logradouro}, ${dadosNegocio.numero || 'S/N'} - ${dadosNegocio.bairro || 'Centro'}` 
    : "Rua Porto Seguro, 155, Zona 01";
  const localidade = dadosNegocio?.cidade ? `${dadosNegocio.cidade} - ${dadosNegocio.uf}` : "Cianorte - PR";
  const telefone = dadosNegocio?.telefone || "(44) 99129-7925";
  
  const nomeUsuario = usuario?.nomeCompleto || usuario?.nome || "Administrador";
  const dataEmissao = new Date().toLocaleString('pt-BR');

  const caminhoImagem = "/src/assets/icons/logo.png";

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { 
            font-family: sans-serif; 
            color: #1f2937; 
            margin: 0; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            border-bottom: 1px solid #e5e7eb; 
            padding-bottom: 15px; 
            margin-bottom: 25px; 
          }
          .header-left { display: flex; gap: 20px; align-items: center; }
          
          /* ALTERAÇÃO PRINCIPAL: Ajuste do filtro CSS para forçar o PNG a ficar na cor laranja (#ff6000).
             O 'brightness(0) saturate(100%)' transforma qualquer imagem em preto puro.
             O restante dos filtros (invert, sepia, saturate, hue-rotate) realiza a transição matemática do preto para o tom exato de #ff6000. */
          .logo {
             width: 75px; 
             height: 75px;
             object-fit: contain;
             filter: brightness(0) saturate(100%) invert(42%) sepia(86%) saturate(4787%) hue-rotate(11deg) brightness(104%) contrast(103%);
          }

          .company-info h1 { margin: 0 0 4px 0; font-size: 14pt; font-weight: 900; color: #111827; text-transform: uppercase; }
          .company-info p { margin: 2px 0; font-size: 8.5pt; color: #4b5563; line-height: 1.4; }

          .header-right { text-align: right; font-size: 8.5pt; color: #6b7280; line-height: 1.4; }
          
          .report-info { margin-bottom: 25px; text-align: center; }
          .report-info h2 { font-size: 14pt; font-weight: 800; text-transform: uppercase; margin: 0 0 5px 0; color: #111827; }
          .report-info p { font-size: 9pt; color: #ff6000; margin: 0; font-weight: 600; }

          .summary-section { margin-bottom: 25px; padding: 15px 0; border-top: 1px dashed #d1d5db; border-bottom: 1px dashed #d1d5db; }
          
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
          th { 
            background-color: #ff6000;
            color: white; 
            padding: 10px 6px; 
            text-align: left; 
            font-weight: 700; 
            text-transform: uppercase;
          }
          td { padding: 10px 6px; border-bottom: 1px solid #f3f4f6; color: #374151; }
          tr:nth-child(even) td { background-color: #fafafa; }
          .right { text-align: right; }

          .footer { 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            display: flex; 
            justify-content: space-between; 
            font-size: 7.5pt; 
            color: #9ca3af; 
            border-top: 1px solid #f3f4f6; 
            padding-top: 10px; 
          }
        </style>
      </head>
      <body>
        <div class="footer">
          <span>Sistema CtrlBase | Gerado digitalmente</span>
          <span>Página 1</span>
        </div>

        <div class="header">
          <div class="header-left">
             <img src="${caminhoImagem}" alt="Logo" class="logo" onerror="this.style.display='none'" />
             <div class="company-info">
                <h1>${nomeFantasia}</h1>
                <p>CNPJ: ${cnpj}</p>
                <p>${localidade} | ${endereco}</p>
                <p><strong>Telefone:</strong> ${telefone}</p>
             </div>
          </div>
          <div class="header-right">
             <div><strong>Operador:</strong> ${nomeUsuario}</div>
             <div><strong>Emissão:</strong> ${dataEmissao}</div>
          </div>
        </div>

        <div class="report-info">
           <h2>${tituloRelatorio}</h2>
           <p>${periodo}</p>
        </div>

        <div class="summary-section">
          ${resumoHtml}
        </div>

        <table>
          <thead>
            <tr>
              ${titulosTabela.map(t => `<th ${['TOTAL', 'VALOR TOTAL', 'FATURAMENTO', 'FATURAMENTO BRUTO', 'QUANTIDADE', 'PESO (KG)', 'M. MAGRA', '% GORDURA'].includes(t.toUpperCase()) ? 'class="right"' : ''}>${t}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${linhasTabela}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  const janela = window.open('', '_blank');
  janela.document.write(html);
  janela.document.close();
  
  setTimeout(() => { 
    janela.print(); 
    janela.close(); 
  }, 500);
};