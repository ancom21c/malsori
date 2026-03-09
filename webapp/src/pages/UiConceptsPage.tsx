import { useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControlLabel,
  Checkbox,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ThemeProvider, createTheme, alpha, type Theme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { useUiStore } from "../store/uiStore";
import { appTheme } from "../app/theme";

type Concept = {
  id: "A" | "B" | "C";
  name: string;
  tagline: string;
  theme: ReturnType<typeof createTheme>;
  backdrop: string;
};

function MiniAppSurface() {
  return (
    <Box
      sx={(theme) => ({
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
      })}
    >
      <Box
        sx={(theme) => ({
          px: 1.5,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(
            theme.palette.secondary.main,
            0.08
          )} 55%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Stack spacing={0} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
            MaLSori
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            Transcription Console
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button size="small" variant="contained" startIcon={<CloudUploadIcon fontSize="small" />}>
            Upload
          </Button>
          <Button size="small" variant="outlined" startIcon={<GraphicEqIcon fontSize="small" />}>
            Live
          </Button>
        </Stack>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" label="Title" fullWidth placeholder="e.g. Interview 02" />
            <TextField size="small" label="Content" fullWidth placeholder="e.g. speaker:john -noise" />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" label="Start" fullWidth placeholder="mm/dd/yyyy" />
            <TextField size="small" label="End" fullWidth placeholder="mm/dd/yyyy" />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <FormControlLabel control={<Checkbox size="small" defaultChecked />} label="File" />
            <FormControlLabel control={<Checkbox size="small" defaultChecked />} label="Realtime" />
            <Chip size="small" variant="outlined" label="Advanced filters collapsed" />
          </Stack>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ p: 1.75 }}>
        <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>
            No records yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: "46ch" }}>
            The empty state should guide first-run users toward the two core actions.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: "100%", justifyContent: "center" }}>
            <Button variant="contained" startIcon={<CloudUploadIcon fontSize="small" />}>
              File Transcription
            </Button>
            <Button variant="outlined" startIcon={<GraphicEqIcon fontSize="small" />}>
              Start Live Session
            </Button>
          </Stack>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader
            title={<Typography variant="subtitle2">Settings JSON</Typography>}
            action={
              <Stack direction="row" spacing={0.5} sx={{ mr: 0.5 }}>
                <Tooltip title="Format JSON">
                  <IconButton size="small" aria-label="format json">
                    <AutoFixHighIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy JSON">
                  <IconButton size="small" aria-label="copy json">
                    <ContentCopyOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
            sx={{ py: 1, "& .MuiCardHeader-action": { alignSelf: "center" } }}
          />
          <CardContent sx={{ pt: 0 }}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={5}
              value={`{\n  "model_name": "sommers",\n  "use_paragraph_splitter": true,\n  "profanity_filter": false\n}`}
              inputProps={{
                style: {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Validation, formatting, and copy affordances make this feel less like a raw textarea.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function ConceptTile({ concept }: { concept: Concept }) {
  return (
    <ThemeProvider theme={concept.theme}>
      <Box
        sx={(theme) => ({
          height: "100%",
          borderRadius: 5,
          padding: 2,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
          background: concept.backdrop,
          boxShadow: "0 22px 60px rgba(0,0,0,0.08)",
        })}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Chip label={`Concept ${concept.id}`} size="small" variant="outlined" />
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
              {concept.name}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {concept.tagline}
          </Typography>
          <MiniAppSurface />
        </Stack>
      </Box>
    </ThemeProvider>
  );
}

export default function UiConceptsPage() {
  const setFloatingActionsVisible = useUiStore((state) => state.setFloatingActionsVisible);

  useEffect(() => {
    setFloatingActionsVisible(false);
    return () => setFloatingActionsVisible(null);
  }, [setFloatingActionsVisible]);

  const concepts = useMemo<Concept[]>(() => {
    const consoleTheme = createTheme(appTheme, {
      palette: {
        primary: { main: "#1f6f64" },
        secondary: { main: "#d9825b" },
        background: { default: "#f5f2ee", paper: "#ffffff" },
        text: { primary: "#142221", secondary: "#465756" },
      },
      shape: { borderRadius: 14 },
      components: {
        MuiButton: {
          styleOverrides: {
            contained: ({ theme }: { theme: Theme }) => ({
              backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(
                theme.palette.primary.main,
                0.82
              )} 55%, ${theme.palette.secondary.main} 140%)`,
              boxShadow: "0 12px 24px rgba(31, 111, 100, 0.22)",
              "&:hover": {
                boxShadow: "0 16px 30px rgba(31, 111, 100, 0.26)",
              },
            }),
          },
        },
        MuiChip: {
          styleOverrides: {
            root: ({ theme }: { theme: Theme }) => ({
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              borderColor: alpha(theme.palette.primary.main, 0.2),
            }),
          },
        },
      },
    });

    const editorialTheme = createTheme(appTheme, {
      palette: {
        primary: { main: "#20302f" },
        secondary: { main: "#b5623a" },
        background: { default: "#fbf7f0", paper: "#fffaf1" },
        text: { primary: "#1c2424", secondary: "#515f5e" },
        divider: alpha("#1c2424", 0.12),
      },
      shape: { borderRadius: 10 },
      typography: {
        h5: { letterSpacing: -0.6 },
        subtitle1: { letterSpacing: -0.2 },
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: ({ theme }: { theme: Theme }) => ({
              boxShadow: "0 14px 36px rgba(0,0,0,0.06)",
              borderColor: alpha(theme.palette.text.primary, 0.14),
            }),
          },
        },
        MuiButton: {
          styleOverrides: {
            outlined: ({ theme }: { theme: Theme }) => ({
              backgroundColor: alpha(theme.palette.secondary.main, 0.06),
              borderColor: alpha(theme.palette.secondary.main, 0.3),
              "&:hover": {
                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
              },
            }),
          },
        },
      },
    });

    const atlasTheme = createTheme(appTheme, {
      palette: {
        primary: { main: "#0f766e" },
        secondary: { main: "#f97316" },
        background: { default: "#f1f7ff", paper: "#ffffff" },
        text: { primary: "#11201f", secondary: "#4a5a59" },
        divider: alpha("#11201f", 0.12),
      },
      shape: { borderRadius: 18 },
      components: {
        MuiCard: {
          styleOverrides: {
            root: ({ theme }: { theme: Theme }) => ({
              boxShadow: "0 22px 70px rgba(15, 118, 110, 0.12)",
              borderColor: alpha(theme.palette.primary.main, 0.18),
            }),
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: ({ theme }: { theme: Theme }) => ({
              "&.Mui-focused": {
                boxShadow: `0 0 0 4px ${alpha(theme.palette.secondary.main, 0.12)}`,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.secondary.main,
              },
            }),
          },
        },
      },
    });

    return [
      {
        id: "A",
        name: "Studio Console",
        tagline:
          "계기판처럼 또렷한 계층, 두 개의 핵심 CTA가 전면에 보이는 '컨트롤 룸' 무드.",
        theme: consoleTheme,
        backdrop:
          "radial-gradient(circle at 20% 10%, rgba(31,111,100,0.16), transparent 52%), radial-gradient(circle at 90% 15%, rgba(217,130,91,0.14), transparent 55%), linear-gradient(180deg, #ffffff 0%, #f5f2ee 65%, #f0f7f6 100%)",
      },
      {
        id: "B",
        name: "Editorial Paper",
        tagline:
          "따뜻한 종이톤, 얕은 그림자, 더 느긋한 타이포로 '읽기 좋은 기록'에 초점을 둔 방향.",
        theme: editorialTheme,
        backdrop:
          "repeating-linear-gradient(135deg, rgba(181,98,58,0.05) 0px, rgba(181,98,58,0.05) 12px, rgba(255,250,241,1) 12px, rgba(255,250,241,1) 24px), linear-gradient(180deg, #fffaf1 0%, #fbf7f0 100%)",
      },
      {
        id: "C",
        name: "Atlas Cards",
        tagline:
          "더 강한 컬러 대비와 큰 라운딩, 카드 중심의 정보 구조로 '대시보드' 느낌을 강화.",
        theme: atlasTheme,
        backdrop:
          "radial-gradient(circle at 15% 10%, rgba(15,118,110,0.14), transparent 55%), radial-gradient(circle at 85% 20%, rgba(249,115,22,0.12), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f1f7ff 70%, #f6f2ee 100%)",
      },
    ];
  }, []);

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2.5, sm: 4 } }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Chip label="Proposed UI" variant="outlined" size="small" icon={<AutoFixHighIcon />} />
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.8 }}>
            UI Concepts
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: "84ch" }}>
          3가지 방향을 같은 구성의 “스타일 타일”로 비교합니다. 마음에 드는 방향을 고르면,
          실제 `/`(리스트), `/settings`, `/realtime`까지 일관되게 확장하는 Proposed UI로 들어갑니다.
        </Typography>
      </Stack>

      <Box
        sx={{
          mt: { xs: 2.5, sm: 3.5 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {concepts.map((concept) => (
          <ConceptTile key={concept.id} concept={concept} />
        ))}
      </Box>
    </Box>
  );
}
