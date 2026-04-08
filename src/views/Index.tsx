import Dashboard from "./Dashboard";

const mockUser = { id: 0, nome: "Admin", email: "", perfil: "Administrador" };

const Index = () => {
  return <Dashboard user={mockUser} onLogout={() => {}} />;
};

export default Index;
