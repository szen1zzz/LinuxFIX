alter table public.analysis_history
  drop constraint if exists analysis_history_distribution_check;

alter table public.analysis_history
  add constraint analysis_history_distribution_check
  check (distribution in ('arch', 'debian', 'fedora', 'nixos', 'cachyos'));

;
