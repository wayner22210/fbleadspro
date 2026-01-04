import ContactsTable from '../../components/ContactsTable';

export default function DashboardContactsPage() {
  return (
    <div style={{ padding: 24, fontFamily: 'Arial' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Contacts</h1>
      <ContactsTable />
    </div>
  );
}
