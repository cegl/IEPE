let loteMapeamento = {}; // Inicializar o objeto vazio

function carregarCSVAutomaticamente() {
  console.log('Iniciando carregamento do CSV automaticamente...'); // Debug log

  fetch('src/assets/tabelavagas.csv') // Caminho do arquivo CSV
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erro ao carregar o CSV: ${response.status}`);
      }
      return response.text();
    })
    .then(csvData => {
      console.log("CSV Data:", csvData); // VERIFY CSV LOAD
      const linhas = csvData.split("\n").map((linha) => linha.trim());
      console.log("Linhas:", linhas); // INSPECT linhas
      const tabelaBody = document.querySelector("tbody");
      tabelaBody.innerHTML = "";

      // Limpar o mapeamento antes de preenchê-lo
      loteMapeamento = {};

      linhas.forEach((linha, index) => {
        if (index === 0 || linha === "") return; // Ignorar cabeçalho e linhas vazias

        console.log("Linha:", linha, "Index:", index); // Check loop execution

        const colunas = linha.split(";");
        console.log("Colunas:", colunas); // Inspect colunas
        const [lote, vaga1, vaga2, vaga3, vaga4] = colunas;

        // Preencher o mapeamento do lote
        loteMapeamento[lote] = [vaga1, vaga2, vaga3, vaga4].filter(vaga => vaga && vaga !== '-'); // Remover valores vazios

        console.log("LoteMapeamento (inside loop):", loteMapeamento); // Check loteMapeamento inside the loop

        // Criar a linha da tabela
        const row = document.createElement("tr");
        row.dataset.lote = lote; // Usar data-lote para vincular ao SVG

        row.innerHTML = `
          <td>${lote}</td>
          <td>${vaga1}</td>
          <td>${vaga2}</td>
          <td>${vaga3}</td>
          <td>${vaga4 || "-"}</td>
        `;
        tabelaBody.appendChild(row);
      });

      console.log('LoteMapeamento gerado:', loteMapeamento); // Log para depuração
      adicionarInteratividade(); // Adicionar interatividade após carregar a tabela
    })
    .catch(error => {
      console.error('Erro ao carregar o CSV:', error);
      document.querySelector("tbody").innerHTML = `
        <tr>
          <td colspan="5">Erro ao carregar dados: ${error.message}</td>
        </tr>
      `;
    });
}

function adicionarInteratividade() {
  const tabelaBody = document.querySelector("tbody");
  const svgObject = document.getElementById("mapa-interativo");

  svgObject.addEventListener("load", () => {
    const svgDoc = svgObject.contentDocument;

    // Comunicação da tabela para o SVG
    tabelaBody.addEventListener("mouseover", (event) => {
      const row = event.target.closest("tr");
      if (row) {
        const lote = row.dataset.lote;
        console.log('Lote to highlight:', lote); // Debug
        highlightVagas(svgDoc, lote); // Destacar os vetores relacionados
        row.classList.add("highlight"); // Destacar a linha da tabela
      }
    });

    tabelaBody.addEventListener("mouseout", (event) => {
      const row = event.target.closest("tr");
      if (row) {
        removeHighlight(svgDoc); // Remover destaque dos vetores relacionados
        row.classList.remove("highlight"); // Remover destaque da linha da tabela
      }
    });

    // Comunicação do SVG para a tabela
    const elementosSVG = svgDoc.querySelectorAll("[id]");
    elementosSVG.forEach(elemento => {
      const id = elemento.id;
      console.log('Vector ID:', id); // Debug

      // Verificar se o ID corresponde ao formato esperado (1 a 3 números seguidos de uma letra)
      // E se o elemento é do tipo relevante (path, rect, circle, polygon, etc.)
      if (/^\d{1,3}[A-Za-z]$/.test(id) && ["path", "rect", "circle", "polygon"].includes(elemento.tagName)) {
        elemento.addEventListener("mouseover", () => {
          console.log(`Mouseover no vetor com ID: ${id}`); // Log do ID do vetor

          const lote = encontrarLoteDoVetor(id); // Encontrar o lote do vetor
          console.log('Lote found for vector:', id, lote); // Debug
          if (lote) {
            console.log(`O vetor com ID: ${id} pertence ao lote: ${lote}`); // Log do lote correspondente
          } else {
            console.log(`Nenhum lote encontrado para o vetor com ID: ${id}`); // Log caso nenhum lote seja encontrado
          }

          const linhaCorrespondente = encontrarLinhaDaTabela(id);
          console.log('Table row found for ID:', id, linhaCorrespondente); // Debug
          if (linhaCorrespondente) {
            linhaCorrespondente.classList.add("highlight"); // Destacar a linha da tabela
          }

          if (lote) {
            highlightVagas(svgDoc, lote); // Destacar os vetores do mesmo lote
          }
        });

        elemento.addEventListener("mouseout", () => {
          const linhaCorrespondente = encontrarLinhaDaTabela(id);
          if (linhaCorrespondente) {
            linhaCorrespondente.classList.remove("highlight"); // Remover destaque da linha da tabela
          }
          removeHighlight(svgDoc); // Remover destaque dos vetores relacionados
        });
      }
    });
  });
}



function highlightVagas(svgDoc, lote) {
  const idsDoLote = loteMapeamento[lote];
  console.log('IDs for lote:', lote, idsDoLote);
  if (!idsDoLote || !idsDoLote.length) return;

  // A cor de destaque com 50% de transparência
  const highlightColor = "rgba(255, 255, 0, 0.5)"; // Amarelo com 50% de alfa

  idsDoLote
    .filter(id => id && id !== '-')
    .forEach(id => {
      const elemento = svgDoc.getElementById(id);
      console.log('Element found for ID:', id, elemento);
      if (elemento) {
        // Salvar o valor original (lógica existente está ok)
        if (!elemento.hasAttribute("data-original-fill-value")) {
           const originalFill = elemento.style.fill || elemento.getAttribute("fill") || "";
           elemento.setAttribute("data-original-fill-value", originalFill);
           elemento.setAttribute("data-original-fill-type", elemento.style.fill ? "style" : "attribute");
        }

        // Destacar aplicando a cor RGBA via estilo inline com !important
        elemento.style.setProperty("fill", highlightColor, "important");
        console.log(`Applied semi-transparent yellow highlight to ${id}`);

      } else {
        console.log(`Element with ID ${id} not found in SVG doc.`);
      }
    });
}

function removeHighlight(svgDoc) {
  const elementos = svgDoc.querySelectorAll("[data-original-fill-value]");
  elementos.forEach((elemento) => {
    const originalFillType = elemento.getAttribute("data-original-fill-type");
    const originalFillValue = elemento.getAttribute("data-original-fill-value");

    if (originalFillType === "style") {
      elemento.style.fill = originalFillValue;
    } else {
      elemento.setAttribute("fill", originalFillValue);
    }

    elemento.removeAttribute("data-original-fill-value");
    elemento.removeAttribute("data-original-fill-type");
  });
}

function encontrarLoteDoVetor(idVetor) {
  console.log(`Procurando o lote para o vetor com ID: ${idVetor}`); // Log para depuração
  for (const [lote, vetores] of Object.entries(loteMapeamento)) {
    if (vetores.includes(idVetor)) {
      console.log(`Lote encontrado: ${lote} para o vetor com ID: ${idVetor}`); // Log do lote encontrado
      return lote;
    }
  }
  console.log(`Nenhum lote encontrado para o vetor com ID: ${idVetor}`); // Log caso nenhum lote seja encontrado
  return null;
}

function encontrarLinhaDaTabela(idVaga) {
  const linhas = document.querySelectorAll("tbody tr");
  for (const linha of linhas) {
    const vagas = Array.from(linha.querySelectorAll("td")).slice(1).map(td => td.textContent.trim());
    if (vagas.includes(idVaga)) {
      return linha;
    }
  }
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  carregarCSVAutomaticamente(); // Carregar o CSV automaticamente ao abrir a página
});
