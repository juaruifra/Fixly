import Loading from "@/components/Loading";

export default function PageLoader({ text = "Cargando…" }) {
  return <Loading text={text} />;
}