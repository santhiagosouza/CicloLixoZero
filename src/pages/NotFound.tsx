import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div 
      className="flex items-center justify-center flex-col p-4 text-center" 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, hsl(140, 20%, 95%), hsl(152, 25%, 90%))' 
      }}
    >
      <div 
        className="card" 
        style={{ 
          maxWidth: '450px', 
          padding: '3rem 2rem',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)'
        }}
      >
        <AlertCircle size={48} style={{ color: 'hsl(var(--destructive))', margin: '0 auto 1.25rem' }} />
        <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Página não encontrada</h1>
        <p className="text-muted text-sm mt-2 mb-4">
          O endereço digitado não existe ou a página foi movida para outro local.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex' }}>
          Voltar para o Início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
