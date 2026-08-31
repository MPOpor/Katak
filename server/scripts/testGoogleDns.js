import dns from 'dns/promises';

async function testPublicDns() {
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  const ips1 = await resolver.resolve4('api.line.me');
  console.log('Google DNS api.line.me:', ips1);

  const ips2 = await resolver.resolve4('api-data.line.me');
  console.log('Google DNS api-data.line.me:', ips2);
}

testPublicDns().catch(console.error);
