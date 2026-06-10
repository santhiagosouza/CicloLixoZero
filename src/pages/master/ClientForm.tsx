import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { ArrowLeft, Building, Save } from 'lucide-react';

interface CompanyType {
  id: string;
  name: string;
}

const ClientForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fields
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [uf, setUf] = useState('SP');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [companyTypeId, setCompanyTypeId] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [peopleCount, setPeopleCount] = useState('');
  const [teamCount, setTeamCount] = useState('');
  const [totalAreaM2, setTotalAreaM2] = useState('');
  const [gasConsumptionM3, setGasConsumptionM3] = useState('');
  const [energyConsumptionKwh, setEnergyConsumptionKwh] = useState('');
  const [operatingDays, setOperatingDays] = useState<string[]>([]);

  // Admin User (creation only)
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1. Fetch Company Types
        const { data: typesData, error: typesError } = await supabase
          .from('company_types')
          .select('*')
          .order('name');

        if (typesError) throw typesError;
        setCompanyTypes((typesData || []) as CompanyType[]);

        // 2. Fetch Client if Edit mode
        if (isEdit) {
          let { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (clientError) {
            console.warn('Erro ao buscar todos os campos do cliente para edição, tentando fallback básico...', clientError);
            const fallbackRes = await supabase
              .from('clients')
              .select('id, name, cnpj, active, uf, company_type_id')
              .eq('id', id)
              .maybeSingle();
            
            if (fallbackRes.error) throw fallbackRes.error;
            client = fallbackRes.data;
          }

          if (client) {
            setName(client.name || '');
            setCnpj(client.cnpj || '');
            setUf(client.uf || 'SP');
            setLicenseNumber(client.license_number || '');
            setCompanyTypeId(client.company_type_id || '');
            setResponsibleName(client.responsible_name || '');
            setPhone(client.phone || '');
            setEmail(client.email || '');
            setCity(client.city || '');
            setAddress(client.address || '');
            setZipCode(client.zip_code || '');
            setPeopleCount(client.people_count?.toString() || '');
            setTeamCount(client.team_count?.toString() || '');
            setTotalAreaM2(client.total_area_m2?.toString() || '');
            setGasConsumptionM3(client.gas_consumption_m3?.toString() || '');
            setEnergyConsumptionKwh(client.energy_consumption_kwh?.toString() || '');
            setOperatingDays(client.operating_days || []);
          } else {
            throw new Error('Empresa não encontrada.');
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      name: name.trim(),
      cnpj: cnpj.trim() || null,
      uf: uf,
      license_number: licenseNumber.trim() || null,
      company_type_id: companyTypeId || null,
      responsible_name: responsibleName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      city: city.trim() || null,
      address: address.trim() || null,
      zip_code: zipCode.trim() || null,
      people_count: peopleCount ? Number(peopleCount) : null,
      team_count: teamCount ? Number(teamCount) : null,
      total_area_m2: totalAreaM2 ? Number(totalAreaM2) : null,
      gas_consumption_m3: gasConsumptionM3 ? Number(gasConsumptionM3) : null,
      energy_consumption_kwh: energyConsumptionKwh ? Number(energyConsumptionKwh) : null,
      operating_days: operatingDays,
    };

    try {
      if (isEdit) {
        // Edit mode
        let { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', id);

        // Fallback for missing database columns
        if (error && (error.message?.includes('column') || error.code === '42703')) {
          console.warn('Novas colunas ausentes no banco. Atualizando apenas dados básicos...');
          const basicPayload = {
            name: payload.name,
            cnpj: payload.cnpj,
            uf: payload.uf,
            company_type_id: payload.company_type_id
          };
          const retry = await supabase
            .from('clients')
            .update(basicPayload)
            .eq('id', id);
          
          error = retry.error;
        }

        if (error) throw error;
        setSuccessMsg('Empresa atualizada com sucesso!');
        setTimeout(() => {
          navigate('/master/clients');
        }, 1500);
      } else {
        // Creation mode
        let insertedClient: any = null;
        let { data, error } = await supabase
          .from('clients')
          .insert({ ...payload, active: true })
          .select()
          .single();

        // Fallback for missing database columns
        if (error && (error.message?.includes('column') || error.code === '42703')) {
          console.warn('Novas colunas ausentes no banco. Inserindo apenas dados básicos...');
          const basicPayload = {
            name: payload.name,
            cnpj: payload.cnpj,
            uf: payload.uf,
            company_type_id: payload.company_type_id,
            active: true
          };
          const retry = await supabase
            .from('clients')
            .insert(basicPayload)
            .select()
            .single();

          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        insertedClient = data;

        // Try to create the client admin if credentials are provided
        if (adminEmail.trim() && adminPassword && insertedClient) {
          try {
            const { data: fnData, error: fnErr } = await supabase.functions.invoke("create-client-admin", {
              body: {
                email: adminEmail.trim(),
                password: adminPassword,
                full_name: adminName.trim() || 'Administrador',
                client_id: insertedClient.id,
                role: "client_admin",
              },
            });

            if (fnErr || (fnData as any)?.error) {
              console.warn('Edge Function create-client-admin falhou ou não existe:', fnErr || (fnData as any)?.error);
              setSuccessMsg('Empresa criada com sucesso! (Aviso: O usuário administrador deve ser configurado manualmente no Supabase).');
            } else {
              setSuccessMsg('Empresa e usuário Administrador criados com sucesso!');
            }
          } catch (fnEx) {
            console.error('Exceção ao chamar Edge Function:', fnEx);
            setSuccessMsg('Empresa criada com sucesso! (Administrador não pôde ser gerado automaticamente).');
          }
        } else {
          setSuccessMsg('Empresa cadastrada com sucesso!');
        }

        setTimeout(() => {
          navigate('/master/clients');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted font-medium pulse-active">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header & Back Button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to="/master/clients" className="btn btn-secondary btn-icon" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0 }} className="flex items-center gap-2 font-semibold">
              <Building size={28} />
              {isEdit ? 'Editar Empresa' : 'Cadastrar Empresa'}
            </h1>
            <p className="text-muted text-sm font-medium">
              {isEdit ? 'Atualize as informações cadastrais e do local da empresa' : 'Cadastre os dados da empresa, métricas do local e administrador'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {errorMsg && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'hsl(var(--destructive))', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'hsl(var(--primary))', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
              {successMsg}
            </div>
          )}

          {/* SECTION 1: IDENTIFICATION */}
          <div className="flex flex-col gap-4">
            <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))', borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '0.4rem', fontWeight: 600 }} className="flex items-center gap-2">
              <span>01.</span> Identificação da Empresa
            </h3>
            
            <div className="form-group">
              <label className="form-label">Razão Social / Nome Fantasia *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Consultoria Ambiental S.A." 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                disabled={submitting}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">CNPJ</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: 00.000.000/0001-00" 
                  value={cnpj} 
                  onChange={e => setCnpj(e.target.value)} 
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Número da Licença</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Número do alvará ou licença" 
                  value={licenseNumber} 
                  onChange={e => setLicenseNumber(e.target.value)} 
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Empresa</label>
                <select 
                  className="form-select" 
                  value={companyTypeId} 
                  onChange={e => setCompanyTypeId(e.target.value)} 
                  disabled={submitting}
                >
                  <option value="">Selecione</option>
                  {companyTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nome do Responsável</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Gestor de Sustentabilidade" 
                  value={responsibleName} 
                  onChange={e => setResponsibleName(e.target.value)} 
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ADDRESS & CONTACT */}
          <div className="flex flex-col gap-4" style={{ marginTop: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))', borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '0.4rem', fontWeight: 600 }} className="flex items-center gap-2">
              <span>02.</span> Endereço e Contato
            </h3>
            
            <div className="form-group">
              <label className="form-label">Endereço Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Av. Paulista, 1000 - Bela Vista" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                disabled={submitting}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: São Paulo" 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">UF (Estado)</label>
                <select 
                  className="form-select" 
                  value={uf} 
                  onChange={e => setUf(e.target.value)} 
                  disabled={submitting}
                >
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">CEP</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: 01310-100" 
                  value={zipCode} 
                  onChange={e => setZipCode(e.target.value)} 
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: (11) 99999-9999" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail Corporativo</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="Ex: contato@empresa.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: AREA METRICS */}
          <div className="flex flex-col gap-4" style={{ marginTop: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))', borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '0.4rem', fontWeight: 600 }} className="flex items-center gap-2">
              <span>03.</span> Dados de Operação do Local
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Nº de Pessoas (Frequência)</label>
                <input 
                  type="number" 
                  min="0"
                  className="form-input" 
                  placeholder="Ex: 250" 
                  value={peopleCount} 
                  onChange={e => setPeopleCount(e.target.value)} 
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nº da Equipe (Staff)</label>
                <input 
                  type="number" 
                  min="0"
                  className="form-input" 
                  placeholder="Ex: 20" 
                  value={teamCount} 
                  onChange={e => setTeamCount(e.target.value)} 
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Área Total (m²)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="form-input" 
                  placeholder="Ex: 1200" 
                  value={totalAreaM2} 
                  onChange={e => setTotalAreaM2(e.target.value)} 
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Consumo de Gás (m³/mês)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="form-input" 
                  placeholder="Média de consumo mensal" 
                  value={gasConsumptionM3} 
                  onChange={e => setGasConsumptionM3(e.target.value)} 
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Consumo de Energia (kWh/mês)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="form-input" 
                  placeholder="Média de consumo mensal" 
                  value={energyConsumptionKwh} 
                  onChange={e => setEnergyConsumptionKwh(e.target.value)} 
                  disabled={submitting}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '0.6rem' }}>Dias de Funcionamento</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { key: 'mon', label: 'Segunda' },
                  { key: 'tue', label: 'Terça' },
                  { key: 'wed', label: 'Quarta' },
                  { key: 'thu', label: 'Quinta' },
                  { key: 'fri', label: 'Sexta' },
                  { key: 'sat', label: 'Sábado' },
                  { key: 'sun', label: 'Domingo' }
                ].map(d => (
                  <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="checkbox" 
                      checked={operatingDays.includes(d.key)} 
                      onChange={() => {
                        setOperatingDays(prev => 
                          prev.includes(d.key) ? prev.filter(x => x !== d.key) : [...prev, d.key]
                        );
                      }} 
                      disabled={submitting}
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: FIRST ADMIN USER */}
          {!isEdit && (
            <div className="flex flex-col gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))', borderBottom: '1px solid hsl(var(--card-border))', paddingBottom: '0.4rem', fontWeight: 600 }} className="flex items-center gap-2">
                <span>04.</span> Primeiro Administrador do Cliente
              </h3>
              
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: João da Silva" 
                  value={adminName} 
                  onChange={e => setAdminName(e.target.value)} 
                  disabled={submitting}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">E-mail de Acesso *</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="Ex: joao.silva@empresa.com" 
                    value={adminEmail} 
                    onChange={e => setAdminEmail(e.target.value)} 
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha de Acesso *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Mínimo de 6 caracteres" 
                    value={adminPassword} 
                    onChange={e => setAdminPassword(e.target.value)} 
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <Link to="/master/clients" className="btn btn-secondary" style={{ pointerEvents: submitting ? 'none' : 'auto', opacity: submitting ? 0.6 : 1 }}>
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitting}>
              <Save size={16} />
              <span>{submitting ? 'Salvando...' : 'Salvar Empresa'}</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default ClientForm;
