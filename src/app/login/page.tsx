'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth as useFirebaseAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      setError('Credenciales inválidas. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        setLoading(false);
        return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any)
    {
      if (error.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está en uso.');
      } else {
        setError('Error al registrar. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl">
        <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
                <Icons.logo className="h-12 w-12 text-primary"/>
            </div>
          <CardTitle className="text-3xl font-bold">GestionaTuDinero</CardTitle>
          <CardDescription>Tu compañero financiero personal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Correo Electrónico</Label>
                  <Input id="email-login" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login">Contraseña</Label>
                  <Input id="password-login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleSignIn} disabled={loading || isUserLoading} className="w-full">
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="signup">
               <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Correo Electrónico</Label>
                  <Input id="email-signup" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Contraseña</Label>
                  <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleSignUp} disabled={loading || isUserLoading} className="w-full">
                   {loading ? 'Registrando...' : 'Registrarse'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
