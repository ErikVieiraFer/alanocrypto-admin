export const formatPhoneNumber = (phone) => {
  if (!phone) {
    return "Não informado";
  }

  // Remove o código do país (+55) e qualquer caractere não numérico
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.replace(/^(55)?(\d{2})(\d{4,5})(\d{4})$/, '($2) $3-$4');
  
  if (match) {
    return match;
  }

  return phone; // Retorna o original se não conseguir formatar
};
