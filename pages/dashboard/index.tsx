import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dashboard/contacts',
      permanent: false,
    },
  };
};

export default function DashboardIndex() {
  return null;
}
