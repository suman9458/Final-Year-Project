import OrderPanel from "../components/OrderPanel"

export default function Trading() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <section className="rounded-lg bg-slate-800 p-4">Market List</section>
      <section className="rounded-lg bg-slate-800 p-4 lg:col-span-2 lg:min-h-96">Chart Area</section>
      <section>
        <OrderPanel />
      </section>
      <section className="rounded-lg bg-slate-800 p-4 lg:col-span-4">Open Positions Table</section>
    </div>
  )
}
