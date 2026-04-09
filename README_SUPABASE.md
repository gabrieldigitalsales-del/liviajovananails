Este pacote ja esta apontando para o seu projeto Supabase.

Antes do deploy, confirme no Supabase:
- tabela public.site_content criada
- RLS ativado nela
- policies de select/insert/update criadas
- bucket publico site-images criado
- policies de select/insert/update/delete em storage.objects para site-images

Na Vercel, basta subir o projeto. Nao precisa de build nem de variaveis para esta versao.
