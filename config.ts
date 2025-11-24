export const config = {
  agency: {
    name: 'Secretaria de Assistência Social',
    city: 'Uruburetama',
    shortName: 'SAS',
    address: 'Rua da Prefeitura, 123', // Placeholder, update if known
  },
  app: {
    name: 'SIAS',
    version: '1.0.0',
    description: 'Sistema de Atendimento da Assistência Social',
  },
  queue: {
    checkInInterval: 15000, // 15 seconds for TV loop
    maxCallHistory: 5,
  }
};
