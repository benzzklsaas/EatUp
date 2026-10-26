-- Croustys Naan — retour aux photos précédentes (annule 1-mise-a-jour.sql)
-- Les anciens fichiers n'ont jamais été supprimés du bucket : restaurer l'URL suffit.
begin;
update public.products p set image_url = b.image_url
  from public.products_image_backup_20261026 b
  where p.id = b.id;
commit;
-- Une fois les nouvelles photos validées en ligne, la sauvegarde peut être supprimée :
-- drop table public.products_image_backup_20261026;
