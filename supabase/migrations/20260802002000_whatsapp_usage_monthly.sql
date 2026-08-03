create table if not exists public.whatsapp_uso_mensal (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  mes date not null,
  mensagens_recebidas bigint not null default 0,
  mensagens_enviadas bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_uso_mensal_counts_check check (
    mensagens_recebidas >= 0 and mensagens_enviadas >= 0
  ),
  constraint whatsapp_uso_mensal_fazenda_mes_key unique (fazenda_id, mes)
);

create index if not exists whatsapp_uso_mensal_mes_idx
  on public.whatsapp_uso_mensal (mes);

alter table public.whatsapp_uso_mensal enable row level security;

-- Aproveita o historico que ja existe, sem contabilizar a antiga mensagem
-- temporaria de processamento caso ela tenha sido gravada.
insert into public.whatsapp_uso_mensal (
  fazenda_id,
  mes,
  mensagens_recebidas,
  mensagens_enviadas
)
select
  fazenda_id,
  date_trunc(
    'month',
    coalesce(processada_em, created_at) at time zone 'America/Fortaleza'
  )::date,
  count(*) filter (
    where direcao = 'inbound'
      and coalesce(payload->>'processing_notice', 'false') <> 'true'
  ),
  count(*) filter (
    where direcao = 'outbound'
      and coalesce(payload->>'processing_notice', 'false') <> 'true'
  )
from public.whatsapp_mensagens
where fazenda_id is not null
group by
  fazenda_id,
  date_trunc(
    'month',
    coalesce(processada_em, created_at) at time zone 'America/Fortaleza'
  )::date
on conflict (fazenda_id, mes) do nothing;

create or replace function public.increment_whatsapp_usage(
  p_fazenda_id uuid,
  p_mes date,
  p_direcao text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_direcao not in ('entrada', 'saida') then
    raise exception 'Direcao de uso do WhatsApp invalida';
  end if;

  insert into public.whatsapp_uso_mensal (
    fazenda_id,
    mes,
    mensagens_recebidas,
    mensagens_enviadas
  )
  values (
    p_fazenda_id,
    date_trunc('month', p_mes)::date,
    case when p_direcao = 'entrada' then 1 else 0 end,
    case when p_direcao = 'saida' then 1 else 0 end
  )
  on conflict (fazenda_id, mes) do update set
    mensagens_recebidas = public.whatsapp_uso_mensal.mensagens_recebidas
      + case when p_direcao = 'entrada' then 1 else 0 end,
    mensagens_enviadas = public.whatsapp_uso_mensal.mensagens_enviadas
      + case when p_direcao = 'saida' then 1 else 0 end,
    updated_at = now();
end;
$$;

revoke all on table public.whatsapp_uso_mensal from anon, authenticated;
revoke all on function public.increment_whatsapp_usage(uuid, date, text) from public;
grant execute on function public.increment_whatsapp_usage(uuid, date, text) to service_role;
