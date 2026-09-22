import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { ArrowLeft, GraduationCap, Save } from 'lucide-react';

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
  const [cpf, setCpf] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [seguimento, setSeguimento] = useState('');
  const [companyTypeId, setCompanyTypeId] = useState('');
  const [responsibleName, setResponsibleName] = useState('');

  const [address, setAddress] = useState('');
  const [bairro, setBairro] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [peopleCount, setPeopleCount] = useState('');
  const [teamCount, setTeamCount] = useState('');
  const [totalAreaM2, setTotalAreaM2] = useState('');
  const [operatingDays, setOperatingDays] = useState<string[]>(['SEG', 'TER', 'QUA', 'QUI', 'SEX']);
  const [operatingShifts, setOperatingShifts] = useState<string[]>(['MANHÃ', 'TARDE']);

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
            console.warn('Erro ao buscar campos da escola, tentando fallback básico...', clientError);
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
            setCpf(client.cpf || '');
            setLicenseNumber(client.license_number || '');
            setSeguimento(client.seguimento || '');
            setCompanyTypeId(client.company_type_id || '');
            setResponsibleName(client.responsible_name || '');

            setAddress(client.address || '');
            setBairro(client.bairro || '');
            setCity(client.city || '');
            setUf(client.uf || 'SP');
            setZipCode(client.zip_code || '');
            setPhone(client.phone || '');
            setEmail(client.email || '');

            setPeopleCount(client.people_count?.toString() || '');
            setTeamCount(client.team_count?.toString() || '');
            setTotalAreaM2(client.total_area_m2?.toString() || '');
            if (client.operating_days && Array.isArray(client.operating_days)) setOperatingDays(client.operating_days);
            if (client.operating_shifts && Array.isArray(client.operating_shifts)) setOperatingShifts(client.operating_shifts);
          } else {
            throw new Error('Escola não encontrada.');
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
      cpf: cpf.trim() || null,
      license_number: licenseNumber.trim() || null,
      seguimento: seguimento || null,
      company_type_id: companyTypeId || null,
      responsible_name: responsibleName.trim() || null,

      address: address.trim() || null,
      bairro: bairro.trim() || null,
      city: city.trim() || null,
      uf: uf,
      zip_code: zipCode.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,

      people_count: peopleCount ? Number(peopleCount) : null,
      team_count: teamCount ? Number(teamCount) : null,
      total_area_m2: totalAreaM2 ? Number(totalAreaM2) : null,
      operating_days: operatingDays,
      operating_shifts: operatingShifts
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
            company_type_id: payload.company_type_id,
            city: payload.city,
            address: payload.address,
            phone: payload.phone,
            email: payload.email,
            people_count: payload.people_count,
            team_count: payload.team_count,
            total_area_m2: payload.total_area_m2
          };
          const retry = await supabase
            .from('clients')
            .update(basicPayload)
            .eq('id', id);
          
          error = retry.error;
        }

        if (error) throw error;
        setSuccessMsg('Escola atualizada com sucesso!');
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
                full_name: adminName.trim() || 'Administrador Escola',
                client_id: insertedClient.id,
                role: "client_admin",
              },
            });

            if (fnErr || (fnData as any)?.error) {
              console.warn('Edge Function create-client-admin falhou ou não existe:', fnErr || (fnData as any)?.error);
              setSuccessMsg('Escola criada com sucesso! (Aviso: O usuário administrador deve ser configurado no Supabase).');
            } else {
              setSuccessMsg('Escola e usuário Administrador criados com sucesso!');
            }
          } catch (fnEx) {
            console.error('Exceção ao chamar Edge Function:', fnEx);
            setSuccessMsg('Escola criada com sucesso! (Administrador não pôde ser gerado automaticamente).');
          }
        } else {
          setSuccessMsg('Escola cadastrada com sucesso!');
        }

        setTimeout(() => {
          navigate('/master/clients');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar escola.');
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
    <div className="flex flex-col gap-6" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Header & Back Button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to="/master/clients" className="btn btn-secondary btn-icon" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0 }} className="flex items-center gap-2 font-semibold">
              <GraduationCap size={28} />
              {isEdit ? 'Editar Escola' : 'Cadastrar Escola'}
            </h1>
            <p className="text-muted text-sm font-medium">
              {isEdit ? 'Atualize as informações cadastrais e do local da escola' : 'Cadastre os dados da escola, estrutura operacional e administrador'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="card" style={{ padding: '2rem', backgroundColor: '#ffffff', borderColor: '#cbd5e1' }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {errorMsg && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '8px', padding: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: '8px', padding: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
              {successMsg}
            </div>
          )}

          {/* SECTION 1: IDENTIFICAÇÃO DA ESCOLA */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Identificação da Escola
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>RAZÃO SOCIAL *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Colégio Ciclo Lixo Zero S.A." 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CNPJ</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="00.000.000/0000-00" 
                value={cnpj} 
                onChange={e => setCnpj(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Nº DA LICENÇA</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Número do alvará ou licença" 
                value={licenseNumber} 
                onChange={e => setLicenseNumber(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>SEGUIMENTO</label>
              <select className="form-select" value={seguimento} onChange={e => setSeguimento(e.target.value)} disabled={submitting}>
                <option value="">Selecione o seguimento...</option>
                <option value="Ensino Infantil">Ensino Infantil</option>
                <option value="Ensino Fundamental I">Ensino Fundamental I</option>
                <option value="Ensino Fundamental II">Ensino Fundamental II</option>
                <option value="Ensino Médio">Ensino Médio</option>
                <option value="Ensino Fundamental + Médio">Ensino Fundamental + Médio</option>
                <option value="Ensino Superior">Ensino Superior</option>
                <option value="Técnico / Profissionalizante">Técnico / Profissionalizante</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>TIPO</label>
              <select 
                className="form-select" 
                value={companyTypeId} 
                onChange={e => setCompanyTypeId(e.target.value)} 
                disabled={submitting}
              >
                <option value="">Selecione o tipo...</option>
                {companyTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>NOME DA DIREÇÃO / RESPONSÁVEL</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Nome do diretor ou responsável" 
                value={responsibleName} 
                onChange={e => setResponsibleName(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CPF DA DIREÇÃO</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="000.000.000-00" 
                value={cpf} 
                onChange={e => setCpf(e.target.value)} 
                disabled={submitting}
              />
            </div>
          </div>

          {/* SECTION 2: ENDEREÇO E CONTATO */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Endereço e Contato
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>ENDEREÇO COMPLETO C/ Nº</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Av. Paulista, 1000" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>BAIRRO</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Bairro" 
                value={bairro} 
                onChange={e => setBairro(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CIDADE</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Cidade" 
                value={city} 
                onChange={e => setCity(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>UF</label>
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
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>CEP</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="00000-000" 
                value={zipCode} 
                onChange={e => setZipCode(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>TELEFONE CEL.</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="(00) 00000-0000" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>E-MAIL</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="contato@escola.com.br" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                disabled={submitting}
              />
            </div>
          </div>

          {/* SECTION 3: DADOS DO LOCAL */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.25rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Dados do Local
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>ÁREA (M²)</label>
              <input 
                type="number" 
                step="0.1"
                className="form-input" 
                placeholder="Ex: 4000" 
                value={totalAreaM2} 
                onChange={e => setTotalAreaM2(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Nº ALUNOS</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="Ex: 600" 
                value={peopleCount} 
                onChange={e => setPeopleCount(e.target.value)} 
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>Nº EQUIPE</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="Ex: 45" 
                value={teamCount} 
                onChange={e => setTeamCount(e.target.value)} 
                disabled={submitting}
              />
            </div>

            {/* LEGENDA DE SELEÇÃO */}
            <div className="md:col-span-3 flex items-center gap-4 text-xs font-semibold" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.85rem', marginBottom: '0.25rem', color: '#475569' }}>
              <span className="font-bold text-slate-700">Legenda de Seleção:</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#157a43', display: 'inline-block' }} />
                <strong style={{ color: '#157a43' }}>Verde:</strong> Ativo / Selecionado
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }} />
                <strong style={{ color: '#dc2626' }}>Vermelho:</strong> Inativo / Não Selecionado
              </span>
            </div>

            {/* FUNCIONAMENTO */}
            <div className="form-group md:col-span-2">
              <label className="form-label font-bold text-xs uppercase block mb-2" style={{ color: '#475569' }}>
                FUNCIONAMENTO (DIAS)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(day => {
                  const isChecked = operatingDays.includes(day);
                  return (
                    <button 
                      key={day} 
                      type="button"
                      onClick={() => {
                        if (submitting) return;
                        setOperatingDays(prev => isChecked ? prev.filter(d => d !== day) : [...prev, day]);
                      }} 
                      style={{ 
                        border: isChecked ? '1px solid #157a43' : '1px solid #dc2626', 
                        borderRadius: '6px', 
                        padding: '0.45rem 0.85rem', 
                        backgroundColor: isChecked ? '#157a43' : '#dc2626', 
                        color: '#ffffff', 
                        fontWeight: 700, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PERÍODOS */}
            <div className="form-group">
              <label className="form-label font-bold text-xs uppercase block mb-2" style={{ color: '#475569' }}>
                PERÍODOS (TURNOS)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {['MANHÃ', 'TARDE', 'NOITE'].map(shift => {
                  const isChecked = operatingShifts.includes(shift);
                  return (
                    <button 
                      key={shift} 
                      type="button"
                      onClick={() => {
                        if (submitting) return;
                        setOperatingShifts(prev => isChecked ? prev.filter(s => s !== shift) : [...prev, shift]);
                      }} 
                      style={{ 
                        border: isChecked ? '1px solid #157a43' : '1px solid #dc2626', 
                        borderRadius: '6px', 
                        padding: '0.45rem 0.85rem', 
                        backgroundColor: isChecked ? '#157a43' : '#dc2626', 
                        color: '#ffffff', 
                        fontWeight: 700, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {shift}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 4: FIRST ADMIN USER */}
          {!isEdit && (
            <div className="flex flex-col gap-4" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '1rem' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  Primeiro Administrador da Escola
                </h3>
              </div>
              
              <div className="form-group">
                <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>NOME COMPLETO</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: João da Silva" 
                  value={adminName} 
                  onChange={e => setAdminName(e.target.value)} 
                  disabled={submitting}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>E-MAIL DE ACESSO *</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="Ex: admin@escola.com.br" 
                    value={adminEmail} 
                    onChange={e => setAdminEmail(e.target.value)} 
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-bold text-xs uppercase" style={{ color: '#475569' }}>SENHA DE ACESSO *</label>
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
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <Link to="/master/clients" className="btn btn-secondary" style={{ pointerEvents: submitting ? 'none' : 'auto', opacity: submitting ? 0.6 : 1 }}>
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitting} style={{ backgroundColor: '#157a43', borderColor: '#157a43', fontWeight: 700 }}>
              <Save size={16} />
              <span>{submitting ? 'Salvando...' : 'Salvar Escola'}</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default ClientForm;
