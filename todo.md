# Project TODO - StarzyPlay Automation

## Funcionalidades Principais

- [x] Campos de entrada para email, senha e código de referência do usuário
- [x] Campo para inserir email e senha da conta que receberá as referências
- [x] Opção 1: Criar nova conta automaticamente em loop contínuo
- [x] Opção 2: Usar todos os códigos de referência do arquivo TXT na conta especificada
- [x] Sistema de armazenamento de códigos de referência em arquivo/banco de dados
- [x] Integração com APIs de email temporário (mail.tm e guerrillamail)
- [x] Comunicação com API do StarzyPlay para registro, verificação, login e códigos
- [x] Dashboard com logs em tempo real mostrando progresso das operações
- [x] Controles para iniciar/pausar/parar operações em loop
- [x] Exibição de estatísticas (contas criadas, códigos aplicados, falhas, estrelas)

## Backend

- [x] Schema do banco de dados para contas criadas e códigos de referência
- [x] API para email temporário (mail.tm client)
- [x] API para email temporário (guerrillamail client)
- [x] API para StarzyPlay (registro, verificação, login, códigos)
- [x] Endpoint para criar conta automaticamente
- [x] Endpoint para aplicar códigos de referência
- [x] Sistema de logs em tempo real

## Frontend

- [x] Layout principal com título "Automação StarzyPlay Dev. MadagascarMods"
- [x] Formulário de configuração (email, senha, código de referência)
- [x] Formulário da conta de referência (email, senha)
- [x] Seletor de opções (Criar conta / Usar códigos)
- [x] Painel de logs em tempo real
- [x] Painel de estatísticas
- [x] Controles de operação (iniciar, pausar, parar)
- [x] Lista de códigos de referência salvos

## Preparação para Deploy

- [ ] Preparar repositório GitHub
- [ ] Configurar para Render.com

- [ ] Configurar para Render.com

## Correções Solicitadas

- [x] Corrigir integração com API do StarzyPlay para funcionar como código Python
- [x] Testar login com conta thayserodrigo12@gmail.com
- [x] Testar aplicação de códigos de referência
- [x] Garantir que criação de conta funciona igual ao Python

## Importação de Dados

- [x] Criar script para importar contas do arquivo TXT para o banco de dados
- [x] Importar todas as contas criadas pelo usuário (136 contas)
- [x] Adicionar funcionalidade de exportar contas para TXT no site

## Testes Solicitados

- [x] Testar botão "Usar Códigos" para aplicar códigos pendentes (funciona, mas API do StarzyPlay tem limite)
- [x] Testar botão "Exportar TXT" e verificar formato (415 contas exportadas!)
- [x] Testar criação de novas contas com "Iniciar Loop" (funcionando - criou 7 contas)

## Deploy

- [x] Criar repositório GitHub: https://github.com/MadagascarMods/starzyplay-automation
- [x] Adicionar render.yaml para deploy na Render.com
- [ ] Configurar variáveis de ambiente na Render.com (DATABASE_URL, JWT_SECRET)


## Bugs Reportados

- [x] Botão "Iniciar Loop" fica carregando infinitamente na Render.com (corrigido com novas APIs de email)

- [ ] Site não está funcionando corretamente na Render - testar e corrigir

- [ ] Verificar se código de convite está sendo usado corretamente no registro (amigos convidados não aumenta)

- [x] Comparar fluxo do código Python com o site para identificar diferença na contagem de convites
- [x] Corrigir: aplicar código da nova conta na conta de referência após criar (igual ao Python)

- [x] Importar 152 contas do arquivo TXT para o banco TiDB (total agora: 216 contas)

- [ ] Adicionar logo do MadagascarMods ao header do site
