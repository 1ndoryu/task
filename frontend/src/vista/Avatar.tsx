/* La cara de quien usa la app: su foto, o la inicial del nombre si no hay. */
interface Props {
  foto: string | null;
  nombre: string;
  grande?: boolean;
}

export function Avatar({ foto, nombre, grande }: Props) {
  const clase = grande ? 'avatar avatar--grande' : 'avatar';
  if (foto) return <img className={clase} src={foto} alt="" />;
  return (
    <span className={clase} aria-hidden="true">
      {nombre.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
