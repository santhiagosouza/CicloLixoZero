const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const workbook = xlsx.readFile('upload/CLASSIFICAÇÃO.xlsx');

const states = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const financeiro = {
  precos: {},
  custo_rejeito: {}
};

// Inicializar precos
states.forEach(uf => {
  financeiro.precos[uf] = {};
});

// Helper para parsear aba com UF nas colunas
function parsePriceSheet(sheetName, nameColIndex, startRowIndex) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`Aba não encontrada: ${sheetName}`);
    return;
  }
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // A linha 3 do excel (0-indexed: 2) contém os cabeçalhos das UFs
  const headerRow = data[2];
  if (!headerRow) {
    console.warn(`Cabeçalho na linha 3 ausente na aba ${sheetName}`);
    return;
  }
  
  // Mapear os índices das colunas para cada UF
  const ufColIndices = {};
  headerRow.forEach((val, idx) => {
    if (val && states.includes(String(val).trim())) {
      ufColIndices[String(val).trim()] = idx;
    }
  });

  // Percorrer as linhas de dados a partir do startRowIndex
  for (let r = startRowIndex; r < data.length; r++) {
    const row = data[r];
    if (!row || !row[nameColIndex]) continue;
    
    const itemName = String(row[nameColIndex]).trim();
    // Parar se encontrar linhas de observações ou vazias
    if (itemName.startsWith('*') || itemName === '' || itemName.toLowerCase().includes('cor de referência') || itemName.toLowerCase().includes('observações')) {
      break;
    }
    
    // Ler os valores para cada UF
    states.forEach(uf => {
      const colIdx = ufColIndices[uf];
      if (colIdx !== undefined && row[colIdx] !== undefined) {
        const price = Number(row[colIdx]);
        financeiro.precos[uf][itemName] = price;
      }
    });
  }
}

// 1. Aba METAL: nameColIndex: 0, startRowIndex: 3
parsePriceSheet('METAL', 0, 3);

// 2. Aba PLÁSTICO: nameColIndex: 0, startRowIndex: 3
parsePriceSheet('PLÁSTICO', 0, 3);

// 3. Aba PAPEL: nameColIndex: 0, startRowIndex: 3
parsePriceSheet('PAPEL', 0, 3);

// 4. Aba VIDRO: nameColIndex: 0, startRowIndex: 3
parsePriceSheet('VIDRO', 0, 3);

// 5. Aba ORGÂNICO: nameColIndex: 0, startRowIndex: 3
parsePriceSheet('ORGÂNICO', 0, 3);

// 6. Aba REJEITO para obter custo_rejeito:
const rejeitoSheet = workbook.Sheets['REJEITO'];
if (rejeitoSheet) {
  const data = xlsx.utils.sheet_to_json(rejeitoSheet, { header: 1 });
  const headerRow = data[2]; // Linha 3
  const rowValores = data[3]; // Linha 4 ("REJEITO")
  
  if (headerRow && rowValores) {
    headerRow.forEach((val, idx) => {
      if (val && states.includes(String(val).trim())) {
        const uf = String(val).trim();
        const value = Number(rowValores[idx]);
        financeiro.custo_rejeito[uf] = value;
      }
    });
  }
}

// Salvar o arquivo
const fileContent = `export const residuosFinanceiro = ${JSON.stringify(financeiro, null, 2)} as const;\n`;
fs.writeFileSync('src/data/residuosFinanceiro.ts', fileContent);
console.log('Arquivo src/data/residuosFinanceiro.ts gerado com sucesso!');
