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
    // Se o id for uuid, cria um código legível estilo REC-A1B2C3
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

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Resolução de nomes dos itens
  const catName = currentLaunch?.category_id ? (categoryMap[currentLaunch.category_id]?.name || '—') : '—';
  const subName = currentLaunch?.subcategory_id ? (subMap[currentLaunch.subcategory_id] || '—') : '—';
  const typeName = currentLaunch?.type_id ? (typeMap[currentLaunch.type_id]?.name || '—') : '—';
  const pesoFormatado = currentLaunch?.peso_kg != null 
    ? Number(currentLaunch.peso_kg).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
    : '0,00';

  return (
    <div className="recibo-modal-overlay">
      {/* Estilos para tela e para impressão nativa A4 */}
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
          padding: 2rem;
          overflow-y: auto;
          background-color: #ffffff;
        }

        /* Folha A4 do Recibo */
        .recibo-paper {
          background-color: #ffffff;
          padding: 1.5rem 1rem;
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
          border-top: 3px dotted #cbd5e1;
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
          padding-left: 0.75rem;
        }

        .recibo-field-row {
          font-size: 0.82rem;
          line-height: 1.6;
          color: #0f172a;
        }

        .recibo-field-label {
          font-weight: 600;
          color: #1e293b;
        }

        .recibo-field-value {
          font-weight: 400;
          color: #334155;
          margin-left: 0.35rem;
        }

        .recibo-table-banner {
          background-color: #f1f5f9;
          border-radius: 4px;
          padding: 0.85rem 1rem;
          display: grid;
          grid-template-columns: 1.4fr 1.2fr 1.2fr 1.6fr 1fr;
          gap: 0.75rem;
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
          grid-template-columns: 1.5fr 1.5fr 1.5fr;
          gap: 1.5rem;
          font-size: 0.85rem;
        }

        .recibo-sign-line {
          border-top: 1px solid #475569;
          width: 100%;
          max-width: 250px;
          margin: 0 auto;
        }

        .recibo-sign-label {
          font-size: 0.8rem;
          color: #334155;
          margin-top: 0.5rem;
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

        /* CONFIGURAÇÃO EXCLUSIVA DE IMPRESSÃO */
        @media print {
          body * {
            visibility: hidden !important;
          }
          .recibo-modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: none !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .recibo-modal-container {
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .recibo-modal-header-bar {
            display: none !important;
          }
          .recibo-modal-body {
            padding: 0 !important;
            overflow: visible !important;
          }
          .recibo-paper, .recibo-paper * {
            visibility: visible !important;
          }
          .recibo-paper {
            padding: 1.5cm 1cm !important;
            width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="recibo-modal-container">
        {/* Barra superior de ações (Não sai na impressão) */}
        <div className="recibo-modal-header-bar no-print">
          <div className="flex items-center gap-2">
            <div style={{ backgroundColor: '#dcfce7', color: '#157a43', padding: '0.4rem', borderRadius: '8px' }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 className="m-0 text-sm font-bold text-slate-800">Visualização de Recibo de Envio de Resíduos</h3>
              <p className="m-0 text-xs text-muted">Pronto para impressão ou salvamento em PDF oficial</p>
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

              <div className="flex items-end gap-3 no-print">
                {/* Seletor 'Busca Recibos' */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#157a43' }}>
                    Busca Recibos
                  </label>
                  <select
                    className="form-select text-xs font-medium"
                    style={{ borderColor: '#157a43', borderRadius: '8px', minWidth: '220px', padding: '0.4rem 0.6rem' }}
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
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#157a43' }}>
                    Data de Envio
                  </label>
                  <div
                    style={{
                      border: '1px solid #157a43',
                      borderRadius: '8px',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
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

              {/* Versão impressa da Data de Envio */}
              <div className="hidden print:block" style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#157a43', fontWeight: 700, display: 'block' }}>Data de Envio</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{formattedDate}</span>
              </div>
            </div>

            {/* SEÇÃO: Remetente (Escola) e Destinatário (Parceiro) */}
            <div className="grid grid-cols-2 gap-6 my-4">
              
              {/* Coluna 1: Remetente */}
              <div className="recibo-column-box">
                <div className="recibo-section-title">Remetente:</div>
                <div className="flex flex-col gap-1">
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Nome da Escola:</span>
                    <span className="recibo-field-value">{clientInfo?.name || 'Escola Mário Venancio'}</span>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">CNPJ:</span>
                    <span className="recibo-field-value">{clientInfo?.cnpj || '22.333.444/0001-72'}</span>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Endereço:</span>
                    <span className="recibo-field-value">{clientInfo?.address || 'Av. São Luiz de Carlos, 5.482'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Cidade:</span>
                      <span className="recibo-field-value">{clientInfo?.city || 'Campinas'}</span>
                    </div>
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">UF:</span>
                      <span className="recibo-field-value">{clientInfo?.uf || 'SP'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Bairro:</span>
                      <span className="recibo-field-value">{clientInfo?.bairro || 'Jardim Primavera'}</span>
                    </div>
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Telefone:</span>
                      <span className="recibo-field-value">{clientInfo?.phone || '(19) 98120-6670'}</span>
                    </div>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Responsável:</span>
                    <span className="recibo-field-value">{clientInfo?.responsible_name || 'Augusto Leme'}</span>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Destinatário */}
              <div className="recibo-column-box">
                <div className="recibo-section-title">Destinatário:</div>
                <div className="flex flex-col gap-1">
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Empresa:</span>
                    <span className="recibo-field-value">{currentPartner?.name || currentLaunch?.partner_name || currentLaunch?.destino || 'EcoRecicla Soluções Ambientais Ltda'}</span>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">CNPJ:</span>
                    <span className="recibo-field-value">{currentPartner?.cnpj || '12.345.678/0001-90'}</span>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Endereço:</span>
                    <span className="recibo-field-value">{currentPartner?.address || 'Av. Industrial, 1500'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Cidade:</span>
                      <span className="recibo-field-value">{currentPartner?.city || 'Santo André'}</span>
                    </div>
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">UF:</span>
                      <span className="recibo-field-value">{currentPartner?.uf || 'SP'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Bairro:</span>
                      <span className="recibo-field-value">{currentPartner?.bairro || 'Jardim'}</span>
                    </div>
                    <div className="recibo-field-row">
                      <span className="recibo-field-label">Telefone:</span>
                      <span className="recibo-field-value">{currentPartner?.phone || '(11) 4004-9876'}</span>
                    </div>
                  </div>
                  <div className="recibo-field-row">
                    <span className="recibo-field-label">Nome do Transportador:</span>
                    <span className="recibo-field-value">{currentPartner?.transporter_name || 'TransLixo Logística Eireli'}</span>
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
                  <div className="recibo-table-col-val font-medium">{currentLaunch?.vehicle_type || currentPartner?.vehicle_type || 'Caminhão Baú'}</div>
                </div>
                <div>
                  <div className="recibo-table-col-title">Combustível:</div>
                  <div className="recibo-table-col-val font-medium">{currentLaunch?.fuel_type || currentPartner?.fuel_type || 'Diesel'}</div>
                </div>
                <div>
                  <div className="recibo-table-col-title">Placa do Veículo:</div>
                  <div className="recibo-table-col-val font-mono font-bold text-slate-800">
                    {currentLaunch?.vehicle_plate || currentPartner?.plate || 'ABC-8E90'}
                  </div>
                </div>
              </div>
            </div>

            {/* ESPAÇO PARA ASSINATURAS */}
            <div style={{ marginTop: '5.5rem' }}>
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
