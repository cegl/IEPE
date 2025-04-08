let loteMapeamento = {}; // Inicializar o objeto vazio

function carregarCSVAutomaticamente() {
  console.log("Verificando se há uma tabela salva no cache...");

  // Tentar carregar a tabela do cache
  const tabelaSalva = localStorage.getItem("tabelaLotes");
  if (tabelaSalva) {
    console.log("Tabela encontrada no cache, carregando...");
    const dados = JSON.parse(tabelaSalva);
    preencherTabela(dados); // Preencher a tabela com os dados do cache
    return; // Não carregar o CSV se os dados do cache forem encontrados
  }

  console.log("Nenhuma tabela no cache, carregando CSV...");
  fetch("src/assets/tabelavagas.csv")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Erro ao carregar o CSV: ${response.status}`);
      }
      return response.text();
    })
    .then((csvData) => {
      const linhas = csvData.split("\n").map((linha) => linha.trim());
      preencherTabela(
        linhas
          .slice(1) // Ignorar o cabeçalho
          .filter((linha) => linha !== "") // Ignorar linhas vazias
          .map((linha) => linha.split(";"))
      );
    })
    .catch((error) => {
      console.error("Erro ao carregar o CSV:", error);
      document.querySelector("tbody").innerHTML = `
        <tr>
          <td colspan="5">Erro ao carregar dados: ${error.message}</td>
        </tr>
      `;
    });
}

function preencherTabela(dados) {
  const tabelaBody = document.querySelector("tbody");
  tabelaBody.innerHTML = ""; // Limpar a tabela

  dados.forEach((linha) => {
    const row = document.createElement("tr");
    row.setAttribute("draggable", "true");
    row.innerHTML = linha.map((coluna) => `<td>${coluna}</td>`).join("");
    tabelaBody.appendChild(row);
  });

  adicionarEventosDragAndDrop(); // Reaplicar os eventos de drag-and-drop
}

function adicionarEventosDragAndDrop() {
  const tabelaBody = document.querySelector("tbody");
  let draggedRow = null;

  tabelaBody.addEventListener("dragstart", (e) => {
    if (e.target.tagName === "TR") {
      draggedRow = e.target;
      e.target.classList.add("dragging");
    }
  });

  tabelaBody.addEventListener("dragend", (e) => {
    if (draggedRow) {
      draggedRow.classList.remove("dragging");
      draggedRow = null;
    }
  });

  tabelaBody.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(tabelaBody, e.clientY);
    if (afterElement == null) {
      tabelaBody.appendChild(draggedRow);
    } else {
      tabelaBody.insertBefore(draggedRow, afterElement);
    }
  });

  function getDragAfterElement(container, y) {
    const rows = [...container.querySelectorAll("tr:not(.dragging)")];

    return rows.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }
}

function adicionarInteratividade() {
  const tabelaBody = document.querySelector("tbody");
  const svgObject = document.getElementById("mapa-interativo");

  // Adicionar eventos de arrastar e soltar
  adicionarEventosDragAndDrop();

  svgObject.addEventListener("load", () => {
    const svgDoc = svgObject.contentDocument;

    // Comunicação da tabela para o SVG
    tabelaBody.addEventListener("mouseover", (event) => {
      const row = event.target.closest("tr");
      if (row) {
        const lote = row.dataset.lote;
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

      if (/^\d{1,3}[A-Za-z]$/.test(id) && ["path", "rect", "circle", "polygon"].includes(elemento.tagName)) {
        elemento.addEventListener("mouseover", () => {
          const lote = encontrarLoteDoVetor(id);
          const linhaCorrespondente = encontrarLinhaDaTabela(id);
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

document.getElementById("baixar-tabela").addEventListener("click", () => {
  const tabelaBody = document.querySelector("tbody");
  const linhas = Array.from(tabelaBody.querySelectorAll("tr")).map((row) => {
    return Array.from(row.querySelectorAll("td")).map((td) => td.textContent.trim());
  });

  const csvContent = linhas.map((linha) => linha.join(";")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "tabela-lotes.csv";
  link.click();
});

document.getElementById("salvar-tabela").addEventListener("click", () => {
  const tabelaBody = document.querySelector("tbody");
  const linhas = Array.from(tabelaBody.querySelectorAll("tr")).map((row) => {
    return Array.from(row.querySelectorAll("td")).map((td) => td.textContent.trim());
  });

  localStorage.setItem("tabelaLotes", JSON.stringify(linhas)); // Salvar no cache
  alert("Tabela salva no cache do navegador!");
});

document.addEventListener("DOMContentLoaded", () => {
  const tabelaLotes = document.querySelector("#tabela-lotes tbody");

  // Função para carregar o CSV
  carregarCSVAutomaticamente(); // Carregar o CSV automaticamente ao abrir a página

  // Função para adicionar eventos de arrastar e soltar
  adicionarEventosDragAndDrop();
  
  const svgObject = document.getElementById("mapa-interativo");

  svgObject.addEventListener("load", () => {
    const svgDoc = svgObject.contentDocument;
    const svgElement = svgDoc.documentElement;

    let scale = 1; // Escala inicial

    svgElement.addEventListener("wheel", (event) => {
      event.preventDefault();
      const zoomFactor = 0.1;
      scale += event.deltaY < 0 ? zoomFactor : -zoomFactor;
      scale = Math.min(Math.max(scale, 0.5), 3); // Limitar o zoom entre 0.5x e 3x
      svgElement.style.transform = `scale(${scale})`;
      svgElement.style.transformOrigin = "center center"; // Centralizar o zoom
    });
  });
});

