import React from "react";
import { Box, Paper, Typography, Stack, Button } from "@mui/material";
import {
	DataGrid,
	GridColDef,
	GridToolbar,
	GridRowsProp,
} from "@mui/x-data-grid";
import { GetApp as DownloadIcon } from "@mui/icons-material";
import {
	getBackgrounds,
	borderRadius as br,
	spacing,
	getColors,
} from "../styles.theme";

interface AdminTableProps {
	rows: GridRowsProp;
	columns: GridColDef[];
	loading?: boolean;
	title: string;
	onExport?: () => void;
	exportLabel?: string;
	actionButton?: React.ReactNode;
	maxWidth?: string | number;
}

export const AdminTable: React.FC<AdminTableProps> = ({
	rows,
	columns,
	loading = false,
	title,
	onExport,
	exportLabel = "Exportar CSV",
	actionButton,
	maxWidth = 1550,
}) => {
	return (
		<Box sx={{ display: "flex", justifyContent: "center" }}>
			<Box sx={{ width: "100%", maxWidth }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme) => getColors(theme.palette.mode).glassBorder,
					}}
				>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						sx={{ mb: spacing.lg }}
					>
						<Typography variant="h6" fontWeight="bold">
							{title}
						</Typography>
						<Stack direction="row" spacing={2}>
							{onExport && (
								<Button
									startIcon={<DownloadIcon />}
									variant="outlined"
									size="small"
									onClick={onExport}
									sx={{ borderRadius: br.lg }}
								>
									{exportLabel}
								</Button>
							)}
							{actionButton}
						</Stack>
					</Stack>
					<Box
						sx={{
							width: "100%",
							"& .MuiDataGrid-root": { border: "none" },
							"& .MuiDataGrid-cell": {
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							},
							"& .MuiDataGrid-columnHeader": {
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							},
							"& .MuiDataGrid-columnHeaderTitle": {
								textAlign: "center",
								width: "100%",
							},
						}}
					>
						<DataGrid
							rows={rows}
							columns={columns}
							loading={loading}
							slots={{ toolbar: GridToolbar }}
							slotProps={{ toolbar: { showQuickFilter: true } }}
							pageSizeOptions={[10, 25, 50]}
							initialState={{
								pagination: { paginationModel: { pageSize: 10 } },
							}}
							autoHeight
						/>
					</Box>
				</Paper>
			</Box>
		</Box>
	);
};
