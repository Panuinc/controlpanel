export interface SSLCertificate {
  name: string;
  domains: string[];
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'valid' | 'expiring' | 'expired';
  certificatePath: string;
  privateKeyPath: string;
}

export interface SSLRequestParams {
  domain: string;
  email: string;
}
