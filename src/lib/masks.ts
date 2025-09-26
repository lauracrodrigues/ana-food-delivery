export const masks = {
  cnpj: (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  },

  cpf: (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1-$2')
      .substring(0, 14);
  },

  cep: (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  },

  phone: (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
      .substring(0, 15);
  },

  onlyNumbers: (value: string) => {
    return value.replace(/\D/g, '');
  },

  subdomain: (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
};

// API Functions
export const fetchCNPJData = async (cnpj: string) => {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return null;
  
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    return {
      companyName: data.razao_social || data.nome_fantasia || '',
      fantasyName: data.nome_fantasia || '',
      email: data.email || '',
      phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone_1}` : '',
      zipCode: data.cep || '',
      address: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.municipio || '',
      state: data.uf || '',
      number: data.numero || ''
    };
  } catch (error) {
    console.error('Erro ao buscar dados do CNPJ:', error);
    return null;
  }
};

export const fetchCEPData = async (cep: string) => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;
  
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    return {
      zipCode: data.cep || '',
      address: data.street || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      state: data.state || ''
    };
  } catch (error) {
    console.error('Erro ao buscar dados do CEP:', error);
    return null;
  }
};

export const validators = {
  cnpj: (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    
    if (numbers.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(numbers)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    const checkDigit1 = numbers.split('').slice(0, 12)
      .reduce((sum, digit, index) => sum + parseInt(digit) * weights1[index], 0);
    const remainder1 = checkDigit1 % 11;
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;
    
    if (parseInt(numbers[12]) !== digit1) return false;
    
    const checkDigit2 = numbers.split('').slice(0, 13)
      .reduce((sum, digit, index) => sum + parseInt(digit) * weights2[index], 0);
    const remainder2 = checkDigit2 % 11;
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
    
    return parseInt(numbers[13]) === digit2;
  },

  cpf: (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    
    if (numbers.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(numbers)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers[i]) * (10 - i);
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(numbers[9]) !== digit1) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers[i]) * (11 - i);
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return parseInt(numbers[10]) === digit2;
  },

  cep: (cep: string) => {
    const numbers = cep.replace(/\D/g, '');
    return numbers.length === 8;
  },

  email: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  subdomain: (subdomain: string) => {
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    return subdomainRegex.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 63;
  }
};