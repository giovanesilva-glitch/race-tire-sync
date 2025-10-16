-- Correção: adicionar security_invoker na view tires_counts
alter view public.tires_counts set (security_invoker=on);