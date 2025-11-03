# Firebase Security Rules

Este documento contém as regras de segurança recomendadas para o Firestore e Storage do projeto AlanoCryptoFX.

## Firestore Rules

Configure estas regras no Firebase Console -> Firestore Database -> Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'admin@alanocryptofx.com';
    }

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Users collection - apenas leitura para admin
    match /users/{userId} {
      allow read: if isAdmin();
      allow write: if false; // Usuários não podem ser criados/editados pelo admin
    }

    // Posts dos usuários - apenas leitura para admin
    match /posts/{postId} {
      allow read: if isAdmin();
      allow write: if false; // Posts de usuários não podem ser editados pelo admin
    }

    // Posts do Alano - gerenciamento completo pelo admin
    match /alano_posts/{postId} {
      allow read: if true; // Qualquer um pode ler (público no app principal)
      allow create, update, delete: if isAdmin();
    }

    // Signals - gerenciamento completo pelo admin
    match /signals/{signalId} {
      allow read: if true; // Qualquer um pode ler (público no app principal)
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Storage Rules

Configure estas regras no Firebase Console -> Storage -> Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'admin@alanocryptofx.com';
    }

    // Imagens dos posts do Alano
    match /alano_posts/{postId}/{fileName} {
      // Permitir leitura pública
      allow read: if true;

      // Permitir upload/delete apenas para admin
      allow write, delete: if isAdmin()
                           && request.resource.size < 5 * 1024 * 1024 // Max 5MB
                           && request.resource.contentType.matches('image/.*'); // Apenas imagens
    }
  }
}
```

## Como Configurar

### 1. Firestore Rules

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **alanocryptofx-v2**
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Rules**
5. Cole as regras do Firestore acima
6. Clique em **Publish**

### 2. Storage Rules

1. No Firebase Console, clique em **Storage**
2. Clique na aba **Rules**
3. Cole as regras do Storage acima
4. Clique em **Publish**

## Configuração do Admin

Para definir o email do administrador:

1. Crie um usuário no Firebase Authentication com o email desejado (ex: admin@alanocryptofx.com)
2. Use este email para fazer login no painel administrativo
3. Atualize as regras acima substituindo 'admin@alanocryptofx.com' pelo email correto

## Testes de Segurança

Após configurar as regras, teste:

1. **Como Admin (logado):**
   - Deve conseguir criar/editar/deletar sinais
   - Deve conseguir criar/editar/deletar posts do Alano
   - Deve conseguir fazer upload de imagens
   - Deve conseguir ler usuários

2. **Como Usuário Não Autenticado:**
   - Deve conseguir ler sinais (público)
   - Deve conseguir ler posts do Alano (público)
   - NÃO deve conseguir criar/editar/deletar nada

3. **Como Usuário Comum (não admin):**
   - Deve conseguir ler sinais
   - Deve conseguir ler posts do Alano
   - NÃO deve conseguir criar/editar/deletar nada

## Notas de Segurança

- As regras garantem que apenas o admin pode criar/editar/deletar sinais e posts
- Sinais e posts são públicos para leitura (necessário para o app principal)
- Uploads de imagem limitados a 5MB
- Apenas imagens podem ser enviadas
- Usuários comuns não podem ser criados/editados pelo admin (gerenciados pelo app principal)

## Troubleshooting

Se encontrar erros de permissão:

1. Verifique se está logado com o email correto do admin
2. Verifique se as regras foram publicadas corretamente
3. Verifique se o email nas regras corresponde ao email do usuário
4. Aguarde alguns segundos após publicar as regras (pode haver delay)

## Custom Claims (Opcional)

Para uma solução mais escalável, considere usar Custom Claims:

```javascript
// No Functions do Firebase
admin.auth().setCustomUserClaims(uid, { admin: true });

// Nas rules:
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}
```

Isso permite ter múltiplos admins sem modificar as rules.
