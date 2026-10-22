import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function Home() {
  return (
    <Container component="main" sx={{ py: 3 }}>
      <Typography variant="h5" component="h1">
        Задачи
      </Typography>
    </Container>
  );
}
