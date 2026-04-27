import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNPSStore } from '../stores/npsStore';

export default function NPSSurvey() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { submitNPSSurvey } = useNPSStore();
  
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Link de pesquisa inválido ou expirado');
    }
  }, [token]);

  const handleSubmit = async () => {
    if (score === null || !token) return;
    
    setLoading(true);
    const success = await submitNPSSurvey(token, score, feedback);
    
    if (success) {
      setSubmitted(true);
    } else {
      setError('Erro ao enviar pesquisa. Tente novamente.');
    }
    setLoading(false);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-editorial-paper dark:bg-editorial-navy-dark flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-editorial-rose mx-auto mb-4" />
          <CardTitle className="text-xl mb-2">Link Inválido</CardTitle>
          <CardDescription>{error}</CardDescription>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-editorial-paper dark:bg-editorial-navy-dark flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-editorial-sage mx-auto mb-4" />
          <CardTitle className="text-xl mb-2">Obrigado!</CardTitle>
          <CardDescription className="mb-4">
            Sua opinião é muito importante para nós.
            {score && score >= 9 && (
              <p className="mt-4 text-editorial-gold">
                Agradecemos sua confiança! Se indicar nossos serviços, ganhe R$ 200 de desconto em sua próxima consulta.
              </p>
            )}
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-editorial-paper dark:bg-editorial-navy-dark flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardTitle className="text-2xl mb-2 text-center">
          Como foi sua experiência?
        </CardTitle>
        <CardDescription className="text-center mb-6">
          Em uma escala de 0 a 10, qual a probabilidade de você recomendar nossa clínica?
        </CardDescription>

        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => setScore(n)}
              className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                score === n
                  ? 'bg-editorial-gold text-editorial-navy scale-110'
                  : n <= 6
                  ? 'bg-editorial-rose/20 text-editorial-rose hover:bg-editorial-rose/30'
                  : n <= 8
                  ? 'bg-editorial-gold/20 text-editorial-gold hover:bg-editorial-gold/30'
                  : 'bg-editorial-sage/20 text-editorial-sage hover:bg-editorial-sage/30'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-sm text-editorial-muted mb-6 px-2">
          <span>Não recomendaria</span>
          <span>Recomendaria muito</span>
        </div>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Conte-nos mais sobre sua experiência (opcional)"
          className="w-full min-h-[100px] p-3 rounded-lg border border-editorial-cream dark:border-editorial-navy-light bg-white dark:bg-editorial-navy text-editorial-navy dark:text-editorial-cream placeholder:text-editorial-muted resize-none focus-ring mb-4"
        />

        <Button
          onClick={handleSubmit}
          disabled={score === null || loading}
          loading={loading}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          Enviar Pesquisa
        </Button>
      </Card>
    </div>
  );
}
