import dns from 'dns';

dns.resolve4('api.line.me', (err, addresses) => {
  console.log('resolve4 api.line.me:', err ? err.message : addresses);
});

dns.resolve4('api-data.line.me', (err, addresses) => {
  console.log('resolve4 api-data.line.me:', err ? err.message : addresses);
});

dns.lookup('api.line.me', (err, address, family) => {
  console.log('lookup api.line.me:', err ? err.message : address, 'family:', family);
});
