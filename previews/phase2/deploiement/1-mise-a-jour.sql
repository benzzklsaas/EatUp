-- Croustys Naan — nouvelles photos de la carte (scène « table en noyer »)
-- À exécuter dans Supabase > SQL Editor APRÈS avoir envoyé les fichiers de phase2/site/ dans le bucket
-- « products », dossier « crousty-naan/scene/ » (les anciens fichiers restent en place).
-- Seule la colonne image_url change ; identifiants, prix, catégories, options et formules ne sont pas touchés.
-- 37 lignes prêtes ; les lignes « à vérifier » / « non conforme » sont commentées : décommentez-les après validation.

begin;

-- 1. sauvegarde des URL actuelles (sert au retour arrière)
create table if not exists public.products_image_backup_20261026 as
  select id, name, image_url, now() as saved_at from public.products where false;
-- RLS activée sans politique : la sauvegarde n'est pas accessible par l'API publique du site
alter table public.products_image_backup_20261026 enable row level security;
insert into public.products_image_backup_20261026 (id, name, image_url, saved_at)
  select id, name, image_url, now() from public.products
  where id in ('3cddd039-5f40-4660-9ddc-a5f948ca7715', 'be5631f0-035b-43ee-8ba5-d90d4190fb55', '3959721c-325d-43f6-a1a6-ca5046db172e', '7cca8f1a-115a-4a69-a4a2-83a918eb87f7', '152d8ef3-8940-4d21-a117-6277efe18444', '9df9d671-8695-4609-9e9c-811b5c17855f', 'b52f95ee-149d-4471-ac47-0da96a32430c', '63190151-3a6f-4e2c-b808-0b4e6906233d', '7f54f700-418b-422a-937b-65150413722c', '754168fa-398c-48de-9fbd-0074bc6912f5', 'b2f61e1a-58de-422d-9237-49150c960189', 'f3084eb5-aece-4170-a5d1-05b42785f838', 'd5767388-c0de-41e3-8ebe-e322d190884a', '7e86457d-a00d-4c2c-9fc4-7d72e8329147', '3b07f93c-357b-40c9-ba15-ad17342ef4d8', 'f5b73e11-7d26-4133-af9a-66e55166b287', '38a2d189-7bd2-4ba4-b88d-f85b120038f0', '646ba38f-3234-4349-b4af-a75a72b3aa17', '2cdbe18f-3676-4a29-b6bf-b09af3db3ef6', 'ac763753-1288-4c23-b8ec-868d0eca106f', 'c17ac035-7405-4896-a5a4-daca65a9a758', '8b389235-70c3-4b09-a903-82a058802600', 'be37faa2-ea95-44ec-92e7-19f1fb3a8645', 'adf54a58-a8bf-4b3d-a9ee-979cb0e03ffb', '8bec72ff-9505-4157-ab25-7dd9ebecf915', '932a394b-5081-466d-8478-ca38370031e3', '88f6d85a-205c-41be-adee-2f4219d0281f', 'a6c03d28-e838-4022-8968-cac86717820a', '7c6512d7-289b-4566-8340-a30f30105889', '8d0958b3-f6c0-41c6-aaa6-287c36cc4da9', 'b1c2e7bf-c5e4-4232-9e5f-d5575453719f', 'eba5d9aa-e8bc-4512-bcac-1ab005cedb1f', 'cb961829-639b-4779-b627-9c5ba2557258', '51df3771-8de7-42c9-8da5-e1ef2019e7c7', '3707ff98-ba98-4451-991b-37e8ffd190e0', '7abc6721-8e7b-4548-b4a2-1f075d04dd18', '4fcf6fd0-129d-4127-9c08-af5cb1d35806', '6fd01747-c2bb-43ea-b117-ca7b76c272b2', '82a5ec2c-6aeb-4233-a70f-3b915691731b', 'a1212f9a-58cd-42fa-b972-ed84535b2e18', '1b2cc989-0dc5-4691-b460-7b2e47e4a17b', '6fd8452b-28b4-4c9c-853f-76314bda56ca', 'cbd26616-5da9-452d-a5bc-68644e1415b2')
    and id not in (select id from public.products_image_backup_20261026);

-- 2. nouvelles photos (chaque ligne ne change que si l'URL actuelle est encore l'ancienne)
-- update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/smash-burger@1350.jpg?v=6a0f8c6b'
--   where id = '3cddd039-5f40-4660-9ddc-a5f948ca7715' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/smash-burger@1350.jpg?v=49f6dbc6';  -- Smash Burger   (à vérifier)
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/crousty-m@1350.jpg?v=b17ec7fe'
  where id = 'be5631f0-035b-43ee-8ba5-d90d4190fb55' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/crousty-m@1350.jpg?v=9ded0858';  -- Crousty M (sauce au choix)
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/coca-cola@1350.jpg?v=c6d27ef5'
  where id = '3959721c-325d-43f6-a1a6-ca5046db172e' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/coca-cola@1350.jpg?v=1bb20956';  -- Coca-Cola
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/crousty-l@1350.jpg?v=5b9f4743'
  where id = '7cca8f1a-115a-4a69-a4a2-83a918eb87f7' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/crousty-l@1350.jpg?v=135153c8';  -- Crousty L (sauce au choix)
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/tarte-daim@1350.jpg?v=e7801453'
  where id = '152d8ef3-8940-4d21-a117-6277efe18444' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/tarte-daim@1350.jpg?v=9f5006c7';  -- Tarte au Daim
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/smash@1350.jpg?v=6a0f8c6b'
  where id = '9df9d671-8695-4609-9e9c-811b5c17855f' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/smash@1350.jpg?v=f0797720';  -- Smash
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/frites@1350.jpg?v=52318c7c'
  where id = 'b52f95ee-149d-4471-ac47-0da96a32430c' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/frites@1350.jpg?v=0a1e7ca3';  -- Frite
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/sandwich-classic@1350.jpg?v=63d82ac1'
  where id = '63190151-3a6f-4e2c-b808-0b4e6906233d' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/sandwich-classic@1350.jpg?v=f0c100f8';  -- Sandwich Classic
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/sandwich-galette@1350.jpg?v=a6438f5a'
  where id = '7f54f700-418b-422a-937b-65150413722c' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/sandwich-galette@1350.jpg?v=23151e96';  -- Sandwich Galette
-- update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/sandwich-cheese-naan@1350.jpg?v=33e81dc0'
--   where id = '754168fa-398c-48de-9fbd-0074bc6912f5' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/sandwich-cheese-naan@1350.jpg?v=a85eb6c2';  -- Sandwich Cheese Naan   (à vérifier)
-- update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/tacos-m@1350.jpg?v=a084911d'
--   where id = 'b2f61e1a-58de-422d-9237-49150c960189' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/tacos-m@1350.jpg?v=b5cf6669';  -- Tacos M   (à vérifier)
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/coca-zero@1350.jpg?v=7d75a335'
  where id = 'f3084eb5-aece-4170-a5d1-05b42785f838' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/coca-zero@1350.jpg?v=570b193c';  -- Coca-Cola Zéro
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/frites-cheddar@1350.jpg?v=0a98c580'
  where id = 'd5767388-c0de-41e3-8ebe-e322d190884a' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/frites-cheddar@1350.jpg?v=c45a4727';  -- Frites Cheddar
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/frites-cheddar-bacon@1350.jpg?v=b648fa27'
  where id = '7e86457d-a00d-4c2c-9fc4-7d72e8329147' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/frites-cheddar-bacon@1350.jpg?v=e213d226';  -- Frites Cheddar Bacon Oignons frits
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/salade-ranch@1350.jpg?v=ca6e7c6d'
  where id = '3b07f93c-357b-40c9-ba15-ad17342ef4d8' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/salade-ranch@1350.jpg?v=d6746262';  -- Salade Ranch
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/salade-east-side@1350.jpg?v=6976a252'
  where id = 'f5b73e11-7d26-4133-af9a-66e55166b287' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/salade-east-side@1350.jpg?v=a799a14c';  -- Salade East Side
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/salade-veggie@1350.jpg?v=7ae2cfc1'
  where id = '38a2d189-7bd2-4ba4-b88d-f85b120038f0' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/salade-veggie@1350.jpg?v=38785012';  -- Salade Veggie
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/coca-cherry@1350.jpg?v=5f273f91'
  where id = '646ba38f-3234-4349-b4af-a75a72b3aa17' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/coca-cherry@1350.jpg?v=9d6ca610';  -- Coca-Cola Cherry
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/oasis-tropical@1350.jpg?v=aba8c506'
  where id = '2cdbe18f-3676-4a29-b6bf-b09af3db3ef6' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/oasis-tropical@1350.jpg?v=14223721';  -- Oasis Tropical
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/oasis-pomme-poire@1350.jpg?v=f55d72a5'
  where id = 'ac763753-1288-4c23-b8ec-868d0eca106f' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/oasis-pomme-poire@1350.jpg?v=8805a339';  -- Oasis Pomme Poire
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/oasis-pomme-cassis-framboise@1350.jpg?v=abf6471d'
  where id = 'c17ac035-7405-4896-a5a4-daca65a9a758' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/oasis-pomme-cassis-framboise@1350.jpg?v=e62975a0';  -- Oasis Pomme Cassis Framboise
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/oasis-fraise-framboise@1350.jpg?v=99df3764'
  where id = '8b389235-70c3-4b09-a903-82a058802600' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/oasis-fraise-framboise@1350.jpg?v=e5fba392';  -- Oasis Fraise Framboise
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/fanta-orange@1350.jpg?v=6bf2cc4e'
  where id = 'be37faa2-ea95-44ec-92e7-19f1fb3a8645' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/fanta-orange@1350.jpg?v=7917e86c';  -- Fanta Orange
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/fanta-tropical@1350.jpg?v=b20815d3'
  where id = 'adf54a58-a8bf-4b3d-a9ee-979cb0e03ffb' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/fanta-tropical@1350.jpg?v=08433d0f';  -- Fanta Tropical
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/fanta-mangue-dragon@1350.jpg?v=2c85ffed'
  where id = '8bec72ff-9505-4157-ab25-7dd9ebecf915' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/fanta-mangue-dragon@1350.jpg?v=240ab0f7';  -- Fanta Mangue Dragon
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/orangina@1350.jpg?v=aae93ebc'
  where id = '932a394b-5081-466d-8478-ca38370031e3' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/orangina@1350.jpg?v=713f68ef';  -- Orangina
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/dr-pepper@1350.jpg?v=e0ebb9df'
  where id = '88f6d85a-205c-41be-adee-2f4219d0281f' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/dr-pepper@1350.jpg?v=75a994a1';  -- Dr Pepper Original 
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/lipton-peche@1350.jpg?v=31141d98'
  where id = 'a6c03d28-e838-4022-8968-cac86717820a' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/lipton-peche@1350.jpg?v=72d1856f';  -- Lipton Ice Tea Pêche
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/lipton-framboise@1350.jpg?v=a115f5e1'
  where id = '7c6512d7-289b-4566-8340-a30f30105889' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/lipton-framboise@1350.jpg?v=664ee2d2';  -- Lipton Ice Tea Framboise
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/lipton-pasteque-menthe@1350.jpg?v=9f99d045'
  where id = '8d0958b3-f6c0-41c6-aaa6-287c36cc4da9' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/lipton-pasteque-menthe@1350.jpg?v=dc7dab1e';  -- Lipton Ice Tea Pastèque Menthe
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/fuze-tea@1350.jpg?v=f92f728d'
  where id = 'b1c2e7bf-c5e4-4232-9e5f-d5575453719f' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/fuze-tea@1350.jpg?v=d651239f';  -- Fuze Tea
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/cristaline@1350.jpg?v=628820a0'
  where id = 'eba5d9aa-e8bc-4512-bcac-1ab005cedb1f' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/cristaline@1350.jpg?v=1cd5ee92';  -- Cristaline 50cl
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/perrier@1350.jpg?v=18f2793c'
  where id = 'cb961829-639b-4779-b627-9c5ba2557258' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/perrier@1350.jpg?v=241da2cd';  -- Perrier
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/capri-sun@1350.jpg?v=b7233c45'
  where id = '51df3771-8de7-42c9-8da5-e1ef2019e7c7' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/capri-sun@1350.jpg?v=8e685826';  -- CapriSun
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/frites@1350.jpg?v=52318c7c'
  where id = '3707ff98-ba98-4451-991b-37e8ffd190e0' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/frites@1350.jpg?v=0a1e7ca3';  -- Frite
-- update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/tenders@1350.jpg?v=b27d244a'
--   where id = '7abc6721-8e7b-4548-b4a2-1f075d04dd18' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/tenders@1350.jpg?v=462232ae';  -- Tenders maison X4   (non conforme)
-- update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/tacos-l@1350.jpg?v=79f1c778'
--   where id = '4fcf6fd0-129d-4127-9c08-af5cb1d35806' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/tacos-l@1350.jpg?v=64c0cf62';  -- Tacos L   (à vérifier)
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/frites-cheddar@1350.jpg?v=0a98c580'
  where id = '6fd01747-c2bb-43ea-b117-ca7b76c272b2' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/frites-cheddar@1350.jpg?v=c45a4727';  -- Frites Cheddar
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/double-smash@1350.jpg?v=2426105f'
  where id = '82a5ec2c-6aeb-4233-a70f-3b915691731b' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/double-smash@1350.jpg?v=c2bf7e44';  -- Double Smash
-- update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/tacos-xl@1350.jpg?v=32c902d6'
--   where id = 'a1212f9a-58cd-42fa-b972-ed84535b2e18' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/tacos-xl@1350.jpg?v=99a30ba6';  -- Tacos XL   (à vérifier)
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/frites-cheddar-bacon@1350.jpg?v=b648fa27'
  where id = '1b2cc989-0dc5-4691-b460-7b2e47e4a17b' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/frites-cheddar-bacon@1350.jpg?v=e213d226';  -- Frites Cheddar Bacon Oignons frits
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/smash-mountain@1350.jpg?v=a9b46610'
  where id = '6fd8452b-28b4-4c9c-853f-76314bda56ca' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/smash-mountain@1350.jpg?v=e24a41c1';  -- Smash Mountain
update public.products set image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/big-bk@1350.jpg?v=edf4ed7c'
  where id = 'cbd26616-5da9-452d-a5bc-68644e1415b2' and image_url = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/pop/big-bk@1350.jpg?v=5ff08b1a';  -- Big BK

commit;
