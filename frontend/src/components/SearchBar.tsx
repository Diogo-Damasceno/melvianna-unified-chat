export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      className="searchbar"
      type="search"
      placeholder="Buscar por usuário ou conteúdo…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Buscar mensagens"
    />
  );
}
