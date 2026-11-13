import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import type { DestinationPartner } from '../pages/GerenciarParceiros';
import type { WasteLaunch } from '../pages/GerenciarLancamentosReais';

interface ReciboEnvioModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLaunchId?: string | null;
  launches: WasteLaunch[];
  partners: DestinationPartner[];
  clientInfo?: {
    name?: string;
    cnpj?: string;
    address?: string;
    bairro?: string;
    city?: string;
    uf?: string;
    phone?: string;
    responsible_name?: string;
  } | null;
  categoryMap: Record<string, { id: string; name: string }>;
  subMap: Record<string, string>;
  typeMap: Record<string, { id: string; name: string }>;
}

export const ReciboEnvioModal: React.FC<ReciboEnvioModalProps> = ({
  isOpen,
  onClose,
  selectedLaunchId,
  launches,
  partners,
  clientInfo,
  categoryMap,
  subMap,
  typeMap
}) => {
  const [currentId, setCurrentId] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedLaunchId) {
      setCurrentId(selectedLaunchId);
    } else if (launches.length > 0 && !currentId) {
      setCurrentId(launches[0].id);
    }
  }, [selectedLaunchId, launches]);

  // Lançamento atualmente selecionado
  const currentLaunch = useMemo(() => {
    return launches.find(l => l.id === currentId) || launches[0] || null;
  }, [launches, currentId]);

  // Parceiro vinculado ao lançamento
  const currentPartner = useMemo(() => {
    if (!currentLaunch) return null;
    return (
      partners.find(p => p.id === currentLaunch.partner_id) ||
      partners.find(p => p.name.toLowerCase() === (currentLaunch.partner_name || currentLaunch.destino || '').toLowerCase()) ||
      null
    );
  }, [partners, currentLaunch]);

  // ID do recibo formatado amigável
  const formattedReciboId = useMemo(() => {
    if (!currentLaunch) return 'REC-000000';
    const cleanId = currentLaunch.id.replace(/-/g, '').substring(0, 8).toUpperCase();
    return `REC-${cleanId}`;
  }, [currentLaunch]);

  // Data formatada
  const formattedDate = useMemo(() => {
    if (!currentLaunch || !currentLaunch.data) return '';
    try {
      const parts = currentLaunch.data.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(currentLaunch.data + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch {
      return currentLaunch.data;
    }
  }, [currentLaunch]);

  // Resolução de nomes dos itens
  const catName = currentLaunch?.category_id ? (categoryMap[currentLaunch.category_id]?.name || '—') : '—';
  const subName = currentLaunch?.subcategory_id ? (subMap[currentLaunch.subcategory_id] || '—') : '—';
  const typeName = currentLaunch?.type_id ? (typeMap[currentLaunch.type_id]?.name || '—') : '—';
  const pesoFormatado = currentLaunch?.peso_kg != null 
    ? Number(currentLaunch.peso_kg).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
    : '0,00';

  // Dados do Remetente
  const remetenteNome = clientInfo?.name || 'Escola Mário Venancio';
  const remetenteCnpj = clientInfo?.cnpj || '22.333.444/0001-72';
  const remetenteEndereco = clientInfo?.address || 'Av. São Luiz de Carlos, 5.482';
  const remetenteCidade = clientInfo?.city || 'Campinas';
  const remetenteUf = clientInfo?.uf || 'SP';
  const remetenteBairro = clientInfo?.bairro || 'Jardim Primavera';
  const remetenteTelefone = clientInfo?.phone || '(19) 98120-6670';
  const remetenteResponsavel = clientInfo?.responsible_name || 'Augusto Leme';

  // Dados do Destinatário
  const destEmpresa = currentPartner?.name || currentLaunch?.partner_name || currentLaunch?.destino || 'EcoRecicla Soluções Ambientais Ltda';
  const destCnpj = currentPartner?.cnpj || '12.345.678/0001-90';
  const destEndereco = currentPartner?.address || 'Av. Industrial, 1500';
  const destCidade = currentPartner?.city || 'Santo André';
  const destUf = currentPartner?.uf || 'SP';
  const destBairro = currentPartner?.bairro || 'Jardim';
  const destTelefone = currentPartner?.phone || '(11) 4004-9876';
  const destTransportador = currentPartner?.transporter_name || 'TransLixo Logística Eireli';

  // Dados do Transporte
  const transpVeiculo = currentLaunch?.vehicle_type || currentPartner?.vehicle_type || 'Caminhão Baú';
  const transpCombustivel = currentLaunch?.fuel_type || currentPartner?.fuel_type || 'Diesel';
  const transpPlaca = currentLaunch?.vehicle_plate || currentPartner?.plate || 'ABC-8E90';

  // Impressão isolada e perfeita via Iframe
  const handlePrint = () => {
    let iframe = document.getElementById('recibo-isolated-print-frame') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'recibo-isolated-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Recibo - ${formattedReciboId}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 15mm 10mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .recibo-paper {
              width: 100%;
              max-width: 100%;
              padding: 0;
              background: #ffffff;
            }
            .recibo-header {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              margin-bottom: 2rem;
            }
            .recibo-title {
              color: #157a43;
              font-size: 2.85rem;
              font-weight: 800;
              line-height: 1;
              letter-spacing: -0.02em;
            }
            .recibo-header-meta {
              display: flex;
              align-items: flex-end;
              gap: 1.25rem;
            }
            .meta-box-label {
              font-size: 0.72rem;
              color: #475569;
              margin-bottom: 0.25rem;
              font-weight: 600;
            }
            .meta-box-value {
              border: 1px solid #157a43;
              border-radius: 6px;
              padding: 0.35rem 0.85rem;
              font-size: 0.85rem;
              font-weight: 700;
              color: #0f172a;
              min-width: 130px;
              text-align: center;
              background-color: #ffffff;
            }
            .grid-cols-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2rem;
              margin-bottom: 1.25rem;
            }
            .recibo-col {
              border-left: 2px solid #0f172a;
              padding-left: 0.85rem;
            }
            .recibo-section-title {
              font-weight: 800;
              font-style: italic;
              font-size: 0.95rem;
              color: #0f172a;
              margin-bottom: 0.65rem;
            }
            .recibo-row {
              font-size: 0.82rem;
              line-height: 1.65;
              color: #0f172a;
            }
            .recibo-label {
              font-weight: 700;
              color: #0f172a;
            }
            .recibo-val {
              font-weight: 400;
              color: #1e293b;
              margin-left: 0.35rem;
            }
            .recibo-row-split {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.5rem;
            }
            .recibo-dotted-line {
              border: none;
              border-top: 2px dotted #94a3b8;
              margin: 1.5rem 0;
              height: 1px;
              width: 100%;
            }
            .recibo-table-box {
              background-color: #f1f5f9 !important;
              border-radius: 4px;
              padding: 0.85rem 1.15rem;
              display: grid;
              grid-template-columns: 1.2fr 1.1fr 1.1fr 1.4fr 1fr;
              gap: 0.75rem;
              align-items: center;
            }
            .table-head {
              font-size: 0.78rem;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 0.35rem;
            }
            .table-data {
              font-size: 0.85rem;
              font-weight: 500;
              color: #334155;
            }
            .table-data-bold {
              font-size: 0.9rem;
              font-weight: 800;
              color: #0f172a;
            }
            .transport-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 1.5rem;
              margin-top: 0.5rem;
            }
            .sign-area {
              margin-top: 5rem;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3rem;
            }
            .sign-box {
              text-align: center;
            }
            .sign-line {
              border-top: 1px solid #334155;
              width: 240px;
              margin: 0 auto 0.5rem auto;
            }
            .sign-title {
              font-size: 0.85rem;
              font-weight: 600;
              color: #334155;
            }
            .recibo-footer {
              text-align: center;
              font-size: 0.82rem;
              font-style: italic;
              color: #94a3b8;
              margin-top: 3.5rem;
              letter-spacing: 0.02em;
            }
          </style>
        </head>
        <body>
          <div class="recibo-paper">
            
            <!-- TOPO -->
            <div class="recibo-header">
              <h1 class="recibo-title">Recibo</h1>
              <div class="recibo-header-meta">
                <div>
                  <div class="meta-box-label">Data de Envio</div>
                  <div class="meta-box-value">${formattedDate}</div>
                </div>
              </div>
            </div>

            <!-- REMETENTE & DESTINATÁRIO -->
            <div class="grid-cols-2">
              <div class="recibo-col">
                <div class="recibo-section-title">Remetente:</div>
                <div class="recibo-row"><span class="recibo-label">Nome da Escola:</span><span class="recibo-val">${remetenteNome}</span></div>
                <div class="recibo-row"><span class="recibo-label">CNPJ:</span><span class="recibo-val">${remetenteCnpj}</span></div>
                <div class="recibo-row"><span class="recibo-label">Endereço:</span><span class="recibo-val">${remetenteEndereco}</span></div>
                <div class="recibo-row-split">
                  <div class="recibo-row"><span class="recibo-label">Cidade:</span><span class="recibo-val">${remetenteCidade}</span></div>
                  <div class="recibo-row"><span class="recibo-label">UF:</span><span class="recibo-val">${remetenteUf}</span></div>
                </div>
                <div class="recibo-row-split">
                  <div class="recibo-row"><span class="recibo-label">Bairro:</span><span class="recibo-val">${remetenteBairro}</span></div>
                  <div class="recibo-row"><span class="recibo-label">Telefone:</span><span class="recibo-val">${remetenteTelefone}</span></div>
                </div>
                <div class="recibo-row"><span class="recibo-label">Responsável:</span><span class="recibo-val">${remetenteResponsavel}</span></div>
              </div>

              <div class="recibo-col">
                <div class="recibo-section-title">Destinatário:</div>
                <div class="recibo-row"><span class="recibo-label">Empresa:</span><span class="recibo-val">${destEmpresa}</span></div>
                <div class="recibo-row"><span class="recibo-label">CNPJ:</span><span class="recibo-val">${destCnpj}</span></div>
                <div class="recibo-row"><span class="recibo-label">Endereço:</span><span class="recibo-val">${destEndereco}</span></div>
                <div class="recibo-row-split">
                  <div class="recibo-row"><span class="recibo-label">Cidade:</span><span class="recibo-val">${destCidade}</span></div>
                  <div class="recibo-row"><span class="recibo-label">UF:</span><span class="recibo-val">${destUf}</span></div>
                </div>
                <div class="recibo-row-split">
                  <div class="recibo-row"><span class="recibo-label">Bairro:</span><span class="recibo-val">${destBairro}</span></div>
                  <div class="recibo-row"><span class="recibo-label">Telefone:</span><span class="recibo-val">${destTelefone}</span></div>
                </div>
                <div class="recibo-row"><span class="recibo-label">Nome do Transportador:</span><span class="recibo-val">${destTransportador}</span></div>
              </div>
            </div>

            <!-- LINHA PONTILHADA -->
            <div class="recibo-dotted-line"></div>

            <!-- RESÍDUOS DESTINADOS -->
            <div style="margin-bottom: 0.5rem;">
              <div class="recibo-section-title">Resíduos Destinados:</div>
              <div class="recibo-table-box">
                <div>
                  <div class="table-head">ID Recibo</div>
                  <div class="table-data-bold" style="font-family: monospace;">${formattedReciboId}</div>
                </div>
                <div>
                  <div class="table-head">Categoria:</div>
                  <div class="table-data">${catName}</div>
                </div>
                <div>
                  <div class="table-head">Sub Categoria:</div>
                  <div class="table-data">${subName}</div>
                </div>
                <div>
                  <div class="table-head">Tipo de Material:</div>
                  <div class="table-data">${typeName}</div>
                </div>
                <div>
                  <div class="table-head">Peso (kg):</div>
                  <div class="table-data-bold">${pesoFormatado} kg</div>
                </div>
              </div>
            </div>

            <!-- LINHA PONTILHADA -->
            <div class="recibo-dotted-line"></div>

            <!-- DADOS DO TRANSPORTE -->
            <div style="margin-bottom: 0.5rem;">
              <div class="recibo-section-title">Dados do Transporte:</div>
              <div class="transport-grid">
                <div>
                  <div class="table-head">Tipo de Veículo:</div>
                  <div class="table-data">${transpVeiculo}</div>
                </div>
                <div>
                  <div class="table-head">Combustível:</div>
                  <div class="table-data">${transpCombustivel}</div>
                </div>
                <div>
                  <div class="table-head">Placa do Veículo:</div>
                  <div class="table-data-bold" style="font-family: monospace;">${transpPlaca}</div>
                </div>
              </div>
            </div>

            <!-- ASSINATURAS -->
            <div class="sign-area">
              <div class="sign-box">
                <div class="sign-line"></div>
                <div class="sign-title">Responsável Escola</div>
              </div>
              <div class="sign-box">
                <div class="sign-line"></div>
                <div class="sign-title">Transportador</div>
              </div>
            </div>

            <!-- RODAPÉ -->
            <div class="recibo-footer">
              Programa de Gestão de Resíduos e Impactos
            </div>

          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(receiptHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="recibo-modal-overlay">
      <style>{`
        .recibo-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .recibo-modal-container {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          width: 100%;
          max-width: 860px;
          display: flex;
          flex-direction: column;
          max-height: 94vh;
          overflow: hidden;
        }

        .recibo-modal-header-bar {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.85rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .recibo-modal-body {
          padding: 2.25rem 2.5rem;
          overflow-y: auto;
          background-color: #ffffff;
        }

        .recibo-paper {
          background-color: #ffffff;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .recibo-paper h1.recibo-title {
          color: #157a43;
          font-size: 2.75rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .recibo-dotted-line {
          border: none;
          border-top: 2px dotted #94a3b8;
          margin: 1.5rem 0;
          height: 1px;
          width: 100%;
        }

        .recibo-section-title {
          font-weight: 800;
          font-style: italic;
          font-size: 0.95rem;
          color: #0f172a;
          margin-bottom: 0.75rem;
        }

        .recibo-column-box {
          border-left: 2px solid #0f172a;
          padding-left: 0.85rem;
        }

        .recibo-field-row {
          font-size: 0.82rem;
          line-height: 1.65;
          color: #0f172a;
        }

        .recibo-field-label {
          font-weight: 700;
          color: #0f172a;
        }

        .recibo-field-value {
          font-weight: 400;
          color: #1e293b;
          margin-left: 0.35rem;
        }

        .recibo-table-banner {
          background-color: #f1f5f9;
          border-radius: 4px;
          padding: 0.85rem 1.15rem;
          display: grid;
          grid-template-columns: 1.2fr 1.1fr 1.1fr 1.4fr 1fr;
          gap: 0.75rem;
          align-items: center;
        }

        .recibo-table-col-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.35rem;
        }

        .recibo-table-col-val {
          font-size: 0.85rem;
          font-weight: 500;
          color: #334155;
        }

        .recibo-transport-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1.5rem;
          font-size: 0.85rem;
        }

        .recibo-sign-line {
          border-top: 1px solid #334155;
          width: 240px;
          margin: 0 auto 0.5rem auto;
        }

        .recibo-sign-label {
          font-size: 0.85rem;
          color: #334155;
          font-weight: 600;
          text-align: center;
        }

        .recibo-footer-tagline {
          text-align: center;
          font-size: 0.82rem;
          font-style: italic;
          color: #94a3b8;
          margin-top: 3.5rem;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="recibo-modal-container">
        {/* Barra superior de ações */}
        <div className="recibo-modal-header-bar">
          <div className="flex items-center gap-2">
            <div style={{ backgroundColor: '#dcfce7', color: '#157a43', padding: '0.4rem', borderRadius: '8px' }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 className="m-0 text-sm font-bold text-slate-800">Visualização de Recibo de Envio de Resíduos</h3>
              <p className="m-0 text-xs text-muted">Pronto para impressão em 1 página A4 ou download em PDF oficial</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary flex items-center gap-1.5"
              style={{ backgroundColor: '#157a43', borderColor: '#157a43', padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <Printer size={16} />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-icon"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Corpo da Folha do Recibo */}
        <div className="recibo-modal-body" ref={printRef}>
          <div className="recibo-paper">
            
            {/* Topo: Título 'Recibo' e Filtros 'Busca Recibos' + 'Data de Envio' */}
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div>
                <h1 className="recibo-title">Recibo</h1>
              </div>

              <div className="flex items-end gap-3">
                {/* Seletor 'Busca Recibos' */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>
                    Busca Recibos
                  </label>
                  <select
                    className="form-select text-xs font-medium"
                    style={{ borderColor: '#157a43', borderRadius: '6px', minWidth: '220px', padding: '0.4rem 0.6rem' }}
                    value={currentId}
                    onChange={e => setCurrentId(e.target.value)}
                  >
                    {launches.map((l) => {
                      const lDate = l.data ? new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
                      const lDest = l.partner_name || l.destino || 'Parceiro';
                      const lPeso = l.peso_kg ? `${l.peso_kg}kg` : '';
                      const lTypeName = typeMap[l.type_id]?.name || 'Resíduo';
                      return (
                        <option key={l.id} value={l.id}>
                          {lDate} - {lDest} ({lTypeName} - {lPeso})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Data de Envio */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>
                    Data de Envio
                  </label>
                  <div
                    style={{
                      border: '1px solid #157a43',
                      borderRadius: '6px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      minWidth: '130px',
                      textAlign: 'center'
                    }}
                  >
                    {formattedDate || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO: Remetente (Escola) e Destinatário (Parceiro) */}
            <div className="grid grid-cols-2 gap-8 my-4">
              
              {/* Coluna 1: Remetente */}
              <div className="recibo-column-box">
                <div className="recibo-section-title">Remetente:</div>
                <div className="flex flex-col gap-1">
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Nome da Escola:</span>
                    <span className="recibo-field-value">{remetenteNome}</span>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">CNPJ:</span>
                    <span className="recibo-field-value">{remetenteCnpj}</span>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Endereço:</span>
                    <span className="recibo-field-value">{remetenteEndereco}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Cidade:</span>
                      <span className="recibo-field-value">{remetenteCidade}</span>
                    </div>
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">UF:</span>
                      <span className="recibo-field-value">{remetenteUf}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Bairro:</span>
                      <span className="recibo-field-value">{remetenteBairro}</span>
                    </div>
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Telefone:</span>
                      <span className="recibo-field-value">{remetenteTelefone}</span>
                    </div>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Responsável:</span>
                    <span className="recibo-field-value">{remetenteResponsavel}</span>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Destinatário */}
              <div className="recibo-column-box">
                <div className="recibo-section-title">Destinatário:</div>
                <div className="flex flex-col gap-1">
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Empresa:</span>
                    <span className="recibo-field-value">{destEmpresa}</span>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">CNPJ:</span>
                    <span className="recibo-field-value">{destCnpj}</span>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Endereço:</span>
                    <span className="recibo-field-value">{destEndereco}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Cidade:</span>
                      <span className="recibo-field-value">{destCidade}</span>
                    </div>
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">UF:</span>
                      <span className="recibo-field-value">{destUf}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Bairro:</span>
                      <span className="recibo-field-value">{destBairro}</span>
                    </div>
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Telefone:</span>
                      <span className="recibo-field-value">{destTelefone}</span>
                    </div>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Nome do Transportador:</span>
                    <span className="recibo-field-value">{destTransportador}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Linha Pontilhada */}
            <div className="recibo-dotted-line" />

            {/* SEÇÃO: Resíduos Destinados */}
            <div className="my-3">
              <div className="recibo-section-title">Resíduos Destinados:</div>
              <div className="recibo-table-banner">
                <div>
                  <div className="recibo-table-col-title">ID Recibo</div>
                  <div className="recibo-table-col-val font-mono font-bold text-slate-800">{formattedReciboId}</div>
                </div>
                <div>
                  <div className="recibo-table-col-title">Categoria:</div>
                  <div className="recibo-table-col-val font-semibold">{catName}</div>
                </div>
                <div>
                  <div className="recibo-table-col-title">Sub Categoria:</div>
                  <div className="recibo-table-col-val">{subName}</div>
                </div>
                <div>
                  <div className="recibo-table-col-title">Tipo de Material:</div>
                  <div className="recibo-table-col-val font-semibold">{typeName}</div>
                </div>
                <div>
                  <div className="recibo-table-col-title">Peso (kg):</div>
                  <div className="recibo-table-col-val font-bold text-slate-900">{pesoFormatado} kg</div>
                </div>
              </div>
            </div>

            {/* Linha Pontilhada */}
            <div className="recibo-dotted-line" />

            {/* SEÇÃO: Dados do Transporte */}
            <div className="my-3">
              <div className="recibo-section-title">Dados do Transporte:</div>
              <div className="recibo-transport-grid">
                <div>
                  <div className="recibo-table-col-title">Tipo de Veículo:</div>
                  <div className="recibo-table-col-val font-medium">{transpVeiculo}</div>
                </div>
                <div>
                  <div className="recibo-table-col-title">Combustível:</div>
                  <div className="recibo-table-col-val font-medium">{transpCombustivel}</div>
                </div>
                <div>
                  <div className="recibo-table-col-title">Placa do Veículo:</div>
                  <div className="recibo-table-col-val font-mono font-bold text-slate-800">
                    {transpPlaca}
                  </div>
                </div>
              </div>
            </div>

            {/* ESPAÇO PARA ASSINATURAS */}
            <div style={{ marginTop: '5rem' }}>
              <div className="grid grid-cols-2 gap-12">
                <div style={{ textAlign: 'center' }}>
                  <div className="recibo-sign-line" />
                  <div className="recibo-sign-label">Responsável Escola</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="recibo-sign-line" />
                  <div className="recibo-sign-label">Transportador</div>
                </div>
              </div>
            </div>

            {/* RODAPÉ DO PROGRAMA */}
            <div className="recibo-footer-tagline">
              Programa de Gestão de Resíduos e Impactos
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
