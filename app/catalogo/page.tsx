import { permanentRedirect } from "next/navigation";

// El catálogo vive en la portada; esta ruta existe para enlaces y marcadores
// antiguos. Se usa un redirect permanente (308) para que los buscadores
// traspasen la autoridad de la URL vieja a la portada en lugar de tratarla
// como un salto temporal que hay que revisitar.
export default function CatalogoPage() {
  permanentRedirect("/");
}
