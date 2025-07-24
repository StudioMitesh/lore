export const StatCard = ({ label, value }: { label: string; value: number }) => (
    <div className="bg-parchment p-4 rounded-xl border border-gold/10 text-center">
      <p className="text-4xl font-display font-bold text-gold">{value}</p>
      <p className="text-deepbrown/70">{label}</p>
    </div>
)