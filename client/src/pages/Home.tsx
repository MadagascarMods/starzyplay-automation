import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Users, 
  Star, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Trash2,
  Copy,
  Zap,
  Download,
  Upload
} from "lucide-react";

export default function Home() {
  // Form state
  const [inviteCode, setInviteCode] = useState("6247C5");
  const [refEmail, setRefEmail] = useState("");
  const [refPassword, setRefPassword] = useState("");
  
  // Operation state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const stopRef = useRef(false);
  
  // Data queries
  const { data: logs, refetch: refetchLogs } = trpc.logs.list.useQuery({ limit: 100 });
  const { data: statistics, refetch: refetchStats } = trpc.statistics.get.useQuery();
  const { data: accounts, refetch: refetchAccounts } = trpc.accounts.list.useQuery({ limit: 50 });
  const { data: unusedCodes, refetch: refetchUnused } = trpc.accounts.unused.useQuery();
  
  // Mutations
  const createAccountMutation = trpc.automation.createAccount.useMutation();
  const applyAllCodesMutation = trpc.automation.applyAllCodes.useMutation();
  const testLoginMutation = trpc.automation.testLogin.useMutation();
  const clearLogsMutation = trpc.logs.clear.useMutation();
  const resetStatsMutation = trpc.statistics.reset.useMutation();
  
  // Auto-refresh logs
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning) {
        refetchLogs();
        refetchStats();
        refetchAccounts();
        refetchUnused();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isRunning, refetchLogs, refetchStats, refetchAccounts, refetchUnused]);
  
  // Scroll to bottom of logs
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  
  // Create account in loop
  const startCreateLoop = async () => {
    if (!inviteCode) {
      toast.error("Digite o código de convite");
      return;
    }
    
    if (!refEmail || !refPassword) {
      toast.error("Digite o email e senha da conta de referência para ganhar as estrelas");
      return;
    }
    
    setIsRunning(true);
    setIsPaused(false);
    stopRef.current = false;
    
    while (!stopRef.current) {
      if (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      try {
        await createAccountMutation.mutateAsync({ inviteCode, refEmail, refPassword });
        await refetchLogs();
        await refetchStats();
        await refetchAccounts();
        await refetchUnused();
      } catch (error: any) {
        toast.error(`Erro: ${error.message}`);
      }
      
      // Delay between iterations
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    setIsRunning(false);
  };
  
  // Apply all codes
  const startApplyCodes = async () => {
    if (!refEmail || !refPassword) {
      toast.error("Digite o email e senha da conta de referência");
      return;
    }
    
    setIsRunning(true);
    stopRef.current = false;
    
    try {
      const result = await applyAllCodesMutation.mutateAsync({ refEmail, refPassword });
      toast.success(`Concluído: ${result.applied} aplicados, ${result.alreadyUsed} já usados, ${result.failed} falhas`);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
    
    await refetchLogs();
    await refetchStats();
    await refetchAccounts();
    await refetchUnused();
    setIsRunning(false);
  };
  
  const stopOperation = () => {
    stopRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
    toast.info("Operação interrompida");
  };
  
  const togglePause = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? "Operação retomada" : "Operação pausada");
  };
  
  const handleClearLogs = async () => {
    await clearLogsMutation.mutateAsync();
    await refetchLogs();
    toast.success("Logs limpos");
  };
  
  const handleResetStats = async () => {
    await resetStatsMutation.mutateAsync();
    await refetchStats();
    toast.success("Estatísticas resetadas");
  };
  
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado!`);
  };
  
  const handleExportTxt = async () => {
    try {
      const response = await fetch('/api/trpc/accounts.exportTxt');
      const data = await response.json();
      
      if (data?.result?.data?.json?.content) {
        const content = data.result.data.json.content;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `codigos_referencia_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${data.result.data.json.count} contas exportadas!`);
      } else {
        toast.error('Erro ao exportar');
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };
  
  const getLogIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getLogBgColor = (type: string) => {
    switch (type) {
      case "success": return "bg-green-500/10 border-green-500/20";
      case "error": return "bg-red-500/10 border-red-500/20";
      case "warning": return "bg-yellow-500/10 border-yellow-500/20";
      default: return "bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Automação StarzyPlay</h1>
                <p className="text-sm text-muted-foreground">Dev. MadagascarMods</p>
              </div>
            </div>
            
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {isRunning && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  {isPaused ? "Pausado" : "Executando"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Statistics Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-primary/10">
                    <div className="text-2xl font-bold text-primary">{statistics?.accountsCreated || 0}</div>
                    <div className="text-xs text-muted-foreground">Contas Criadas</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <div className="text-2xl font-bold text-green-500">{statistics?.codesAppliedSuccess || 0}</div>
                    <div className="text-xs text-muted-foreground">Códigos Aplicados</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                    <div className="text-2xl font-bold text-yellow-500">{statistics?.codesAlreadyUsed || 0}</div>
                    <div className="text-xs text-muted-foreground">Já Usados</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <div className="text-2xl font-bold text-red-500">{statistics?.codesAppliedFailed || 0}</div>
                    <div className="text-xs text-muted-foreground">Falhas</div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="text-center p-4 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20">
                  <div className="text-3xl font-bold text-primary">{statistics?.starsEarned || 0}</div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Star className="h-4 w-4" /> Estrelas Ganhas
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={handleResetStats}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resetar Estatísticas
                </Button>
              </CardContent>
            </Card>

            {/* Options Tabs */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Selecione uma opção</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">[1] Criar Conta</TabsTrigger>
                    <TabsTrigger value="apply">[2] Usar Códigos</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="create" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Código de Convite para Registro</Label>
                      <Input
                        id="inviteCode"
                        placeholder="Ex: 6247C5"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        disabled={isRunning}
                      />
                      <p className="text-xs text-muted-foreground">
                        Código usado ao registrar novas contas
                      </p>
                    </div>
                    
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground font-medium">
                      Conta que vai receber as estrelas:
                    </p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="refEmailCreate">Email da Conta de Referência</Label>
                      <Input
                        id="refEmailCreate"
                        type="email"
                        placeholder="seu@email.com"
                        value={refEmail}
                        onChange={(e) => setRefEmail(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="refPasswordCreate">Senha da Conta de Referência</Label>
                      <Input
                        id="refPasswordCreate"
                        type="password"
                        placeholder="••••••••"
                        value={refPassword}
                        onChange={(e) => setRefPassword(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={startCreateLoop}
                        disabled={isRunning || !inviteCode || !refEmail || !refPassword}
                      >
                        {isRunning && activeTab === "create" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Iniciar Loop
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Cria contas automaticamente em loop contínuo
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="apply" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="refEmail">Email da Conta de Referência</Label>
                      <Input
                        id="refEmail"
                        type="email"
                        placeholder="seu@email.com"
                        value={refEmail}
                        onChange={(e) => setRefEmail(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="refPassword">Senha da Conta de Referência</Label>
                      <Input
                        id="refPassword"
                        type="password"
                        placeholder="••••••••"
                        value={refPassword}
                        onChange={(e) => setRefPassword(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                    
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm font-medium">Códigos Disponíveis</div>
                      <div className="text-2xl font-bold text-primary">{unusedCodes?.length || 0}</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                          if (!refEmail || !refPassword) {
                            toast.error("Digite email e senha");
                            return;
                          }
                          try {
                            const result = await testLoginMutation.mutateAsync({ email: refEmail, password: refPassword });
                            if (result.success && 'user' in result) {
                              toast.success(`Login OK! Usuário: ${result.user?.name}`);
                            } else {
                              toast.error(`Falha: ${result.error}`);
                            }
                            await refetchLogs();
                          } catch (error: any) {
                            toast.error(`Erro: ${error.message}`);
                          }
                        }}
                        disabled={isRunning || !refEmail || !refPassword || testLoginMutation.isPending}
                      >
                        {testLoginMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Testar Login
                      </Button>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={startApplyCodes}
                      disabled={isRunning || !refEmail || !refPassword || (unusedCodes?.length || 0) === 0}
                    >
                      {isRunning && activeTab === "apply" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Users className="h-4 w-4 mr-2" />
                      )}
                      Aplicar Todos os Códigos
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Aplica todos os códigos não usados na conta especificada
                    </p>
                  </TabsContent>
                </Tabs>
                
                {/* Control buttons */}
                {isRunning && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={togglePause}
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Retomar
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={stopOperation}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Parar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Logs and Accounts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logs Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Logs em Tempo Real
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleClearLogs}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] rounded-lg border border-border bg-background/50 p-4">
                  {logs && logs.length > 0 ? (
                    <div className="space-y-2">
                      {[...logs].reverse().map((log) => (
                        <div 
                          key={log.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border ${getLogBgColor(log.type)}`}
                        >
                          {getLogIcon(log.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {log.operation}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm mt-1 break-words">{log.message}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <RefreshCw className="h-8 w-8 mb-2 opacity-50" />
                      <p>Nenhum log disponível</p>
                      <p className="text-xs">Inicie uma operação para ver os logs</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Accounts Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Contas Criadas ({accounts?.length || 0})
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportTxt}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar TXT
                  </Button>
                </div>
                <CardDescription>
                  Códigos de referência das contas criadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  {accounts && accounts.length > 0 ? (
                    <div className="space-y-2">
                      {accounts.map((account) => (
                        <div 
                          key={account.id} 
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center font-mono font-bold text-primary">
                              {account.referenceCode.slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold">{account.referenceCode}</span>
                                {account.codeApplied ? (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 text-xs">
                                    Aplicado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 text-xs">
                                    Pendente
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {account.username} • {account.email.slice(0, 20)}...
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(account.createdAt).toLocaleDateString()}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => copyCode(account.referenceCode)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                      <Users className="h-8 w-8 mb-2 opacity-50" />
                      <p>Nenhuma conta criada</p>
                      <p className="text-xs">Use a opção 1 para criar contas</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground">
            Automação StarzyPlay Dev. MadagascarMods &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
