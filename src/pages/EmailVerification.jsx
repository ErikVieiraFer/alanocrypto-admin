import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, CheckCircle } from 'lucide-react';
import { sendVerificationEmail, verifyCode } from '../config/cloudFunctions';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const EmailVerification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!email) {
      toast.error('Email não fornecido');
      navigate('/login');
      return;
    }

    // Send verification email automatically
    const sendEmail = async () => {
      const result = await sendVerificationEmail(email);
      if (result.success) {
        setEmailSent(true);
        toast.success('Código de verificação enviado!');
      } else {
        toast.error('Erro ao enviar código');
      }
    };

    sendEmail();
  }, [email, navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await verifyCode(email, data.code);
      if (result.success) {
        toast.success('Email verificado com sucesso!');
        navigate('/');
      } else {
        toast.error(result.error || 'Código inválido');
      }
    } catch (error) {
      toast.error('Erro ao verificar código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const result = await sendVerificationEmail(email);
      if (result.success) {
        toast.success('Novo código enviado!');
      } else {
        toast.error('Erro ao enviar código');
      }
    } catch (error) {
      toast.error('Erro ao reenviar código');
    } finally {
      setIsResending(false);
    }
  };

  if (!emailSent) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-accent/20 rounded-full p-4">
              <Mail className="h-12 w-12 text-accent" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-white mb-2 text-center">
            Verificar Email
          </h2>
          <p className="text-gray-400 text-center mb-6">
            Enviamos um código de 6 dígitos para<br />
            <span className="text-accent font-medium">{email}</span>
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Code Input */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">
                Código de Verificação
              </label>
              <input
                id="code"
                type="text"
                maxLength={6}
                {...register('code', {
                  required: 'Código é obrigatório',
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: 'Código deve ter 6 dígitos',
                  },
                })}
                className="w-full px-4 py-3 bg-primary border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                placeholder="000000"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-500 text-center">{errors.code.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Verificar</span>
                </>
              )}
            </button>
          </form>

          {/* Resend Button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? 'Reenviando...' : 'Reenviar código'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
