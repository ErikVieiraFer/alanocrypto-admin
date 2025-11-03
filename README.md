# AlanoCryptoFX - Painel Administrativo

Painel administrativo completo para gerenciamento de sinais de trading e posts exclusivos da plataforma AlanoCryptoFX.

## Tecnologias Utilizadas

- **React 19** - Framework frontend
- **Vite** - Build tool
- **Tailwind CSS 4** - Framework de estilização
- **Firebase** - Backend (Auth, Firestore, Storage)
- **React Router v6** - Gerenciamento de rotas
- **React Hook Form** - Gerenciamento de formulários
- **React Hot Toast** - Notificações
- **Lucide React** - Ícones

## Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
│   ├── ConfirmDialog.jsx
│   ├── Layout.jsx
│   ├── LoadingSpinner.jsx
│   ├── Modal.jsx
│   └── Navbar.jsx
├── config/            # Configurações
│   └── firebase.js    # Configuração do Firebase
├── contexts/          # Contextos React
│   └── AuthContext.jsx
├── pages/             # Páginas da aplicação
│   ├── AlanoPosts.jsx # Gerenciar posts do Alano
│   ├── Dashboard.jsx  # Dashboard principal
│   ├── Login.jsx      # Página de login
│   └── Signals.jsx    # Gerenciar sinais de trading
├── services/          # Serviços Firebase
│   ├── alanoPostService.js
│   ├── signalService.js
│   └── userService.js
├── App.jsx           # Componente principal com rotas
├── index.css         # Estilos globais
└── main.jsx          # Entry point
```

## Funcionalidades Implementadas

### 1. Autenticação
- Login com email/senha via Firebase Auth
- Proteção de rotas (redirecionamento automático)
- Logout seguro
- Loading states

### 2. Dashboard
- Visão geral com cards de estatísticas
- Total de usuários registrados
- Total de sinais criados
- Sinais ativos
- Posts do Alano

### 3. Gerenciamento de Sinais
- ✅ Criar novos sinais de trading
- ✅ Editar sinais existentes
- ✅ Deletar sinais
- ✅ Fechar sinais (marcar como fechado com % de lucro/perda)
- ✅ Validações completas (entry, targets, stop loss)
- ✅ Suporte para LONG e SHORT
- ✅ Confiança do sinal (0-100%)
- ✅ Observações/notas

**Estrutura do Sinal:**
```javascript
{
  coin: string,           // BTC, ETH, etc
  type: string,           // LONG ou SHORT
  entry: number,          // Preço de entrada
  targets: array,         // [target1, target2, target3]
  stopLoss: number,       // Stop loss
  status: string,         // ATIVO ou FECHADO
  profit: number,         // % de lucro (negativo = perda)
  confidence: number,     // 0-100
  createdAt: timestamp,
  closedAt: timestamp,    // null se ativo
  notes: string,
}
```

### 4. Gerenciamento de Posts do Alano
-  Criar posts com título e conteúdo
-  Editar posts existentes
-  Deletar posts
-  Upload de imagens (max 5MB)
-  Adicionar vídeos do YouTube
-  Preview de thumbnails
-  Contador de likes e views

**Estrutura do Post:**
```javascript
{
  title: string,
  content: string,
  videoUrl: string,       // URL do YouTube (opcional)
  imageUrl: string,       // URL da imagem (opcional)
  createdAt: timestamp,
  likes: number,
  views: number,
}
```

### 5. UI/UX
- Design moderno e minimalista
- Tema escuro (#1a1a2e, #16213e, #00d4ff)
- Responsivo (mobile, tablet, desktop)
- Animações suaves
- Feedback visual em todas as ações
- Modais para criação/edição
- Diálogos de confirmação para ações destrutivas

## Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente do Firebase (já configurado em `src/config/firebase.js`)

4. Execute o projeto em desenvolvimento:
```bash
npm run dev
```

5. Build para produção:
```bash
npm run build
```

6. Preview da build:
```bash
npm run preview
```

## Firebase Configuration

O projeto está conectado ao Firebase project: **alanocryptofx-v2**

### Collections Firestore:
- `users` - Usuários da plataforma
- `posts` - Posts dos usuários
- `alano_posts` - Posts exclusivos do Alano (gerenciados por este admin)
- `signals` - Sinais de trading (gerenciados por este admin)

### Firebase Storage:
- `alano_posts/{postId}/image.jpg` - Imagens dos posts do Alano

## Rotas

- `/login` - Página de login (pública)
- `/` - Dashboard (protegida)
- `/signals` - Gerenciar sinais (protegida)
- `/alano-posts` - Gerenciar posts do Alano (protegida)

## Segurança

- Todas as rotas são protegidas por autenticação
- Validações no cliente e no servidor (Firestore Rules)
- Try-catch em todas as operações Firebase
- Feedback de erro ao usuário
- Proteção contra uploads muito grandes (max 5MB)

## Como Usar

### Fazer Login
1. Acesse `/login`
2. Digite email e senha do admin
3. Será redirecionado para o Dashboard

### Criar um Sinal
1. Acesse "Sinais" no menu
2. Clique em "Criar Sinal"
3. Preencha todos os campos:
   - Moeda (ex: BTC, ETH)
   - Tipo (LONG ou SHORT)
   - Entry (preço de entrada)
   - Targets (até 3 alvos)
   - Stop Loss
   - Confiança (0-100%)
   - Observações (opcional)
4. Clique em "Criar"

### Fechar um Sinal
1. Na lista de sinais ativos
2. Clique no ícone de "Check" (Fechar Sinal)
3. Digite o % de lucro (positivo) ou perda (negativo)
4. Confirme

### Criar um Post do Alano
1. Acesse "Posts do Alano" no menu
2. Clique em "Criar Post"
3. Preencha:
   - Título
   - Conteúdo
   - URL do YouTube (opcional)
   - Upload de imagem (opcional, max 5MB)
4. Clique em "Criar"

## Validações Implementadas

### Sinais:
- Entry deve ser > 0
- Targets devem ser válidos para o tipo (LONG/SHORT)
- Stop Loss deve ser válido para o tipo
- Pelo menos 1 target é obrigatório
- Confiança entre 0-100%

### Posts:
- Título obrigatório
- Conteúdo obrigatório
- URL do YouTube deve ser válida (se fornecida)
- Imagem deve ter no máximo 5MB

## Tratamento de Erros

- Todas as operações Firebase têm try-catch
- Mensagens de erro claras ao usuário
- Loading states durante operações
- Toast notifications para feedback

## Build de Produção

O build de produção gera arquivos otimizados em `/dist`:
- HTML minificado
- CSS com Tailwind otimizado (23KB)
- JS com code-splitting (213KB gzipped)

## Próximos Passos (Opcional)

- [ ] Filtros e busca na lista de sinais
- [ ] Ordenação de sinais e posts
- [ ] Estatísticas avançadas (win rate, lucro médio)
- [ ] Gráficos de performance
- [ ] Exportar relatórios
- [ ] Notificações push
- [ ] Dark mode toggle (já é dark por padrão)

## Suporte

Para questões ou problemas, entre em contato com o desenvolvedor.

---

**Desenvolvido para AlanoCryptoFX**
