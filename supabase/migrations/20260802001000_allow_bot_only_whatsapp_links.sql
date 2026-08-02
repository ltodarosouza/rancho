-- Funcionarios cadastrados pelo WhatsApp podem usar o bot sem uma conta do sistema.
-- A migration e idempotente e tambem corrige instalacoes antigas do schema.
do $$
begin
  if to_regclass('public.whatsapp_usuarios') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'whatsapp_usuarios'
        and column_name = 'usuario_id'
    ) then
      alter table public.whatsapp_usuarios
        alter column usuario_id drop not null;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'whatsapp_usuarios'
        and column_name = 'funcionario_id'
    ) then
      alter table public.whatsapp_usuarios
        alter column funcionario_id drop not null;
    end if;

    alter table public.whatsapp_usuarios
      add column if not exists papel_bot text not null default 'funcionario';
  end if;
end $$;
