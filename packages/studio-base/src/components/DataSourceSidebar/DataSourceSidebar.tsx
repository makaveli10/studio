// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Add24Regular as AddIcon } from "@fluentui/react-icons";
import ClearIcon from "@mui/icons-material/Clear";
import ErrorIcon from "@mui/icons-material/ErrorOutline";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import WarningIcon from "@mui/icons-material/WarningAmber";
import {
  AppBar,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  styled as muiStyled,
  TextField,
  Typography,
  TypographyProps,
} from "@mui/material";
import { Fzf, FzfResultItem } from "fzf";
import { MouseEvent, useCallback, useContext, useMemo, useState } from "react";

import { Topic } from "@foxglove/studio";
import { AppSetting } from "@foxglove/studio-base/AppSetting";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import NotificationModal from "@foxglove/studio-base/components/NotificationModal";
import { SidebarContent } from "@foxglove/studio-base/components/SidebarContent";
import Stack from "@foxglove/studio-base/components/Stack";
import ModalContext from "@foxglove/studio-base/context/ModalContext";
import { useAppConfigurationValue } from "@foxglove/studio-base/hooks/useAppConfigurationValue";
import { PlayerProblem } from "@foxglove/studio-base/players/types";
import { fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

import { DataSourceInfo } from "./DataSourceInfo";
import helpContent from "./help.md";

type Props = {
  onSelectDataSourceAction: () => void;
};

function itemToFzfResult(item: Topic): FzfResultItem<Topic> {
  return {
    item,
    score: 0,
    positions: new Set<number>(),
    start: 0,
    end: 0,
  };
}

const HighlightChars = ({
  str,
  indices,
  color,
  offset = 0,
}: {
  str: string;
  indices: Set<number>;
  color?: TypographyProps["color"];
  offset?: number;
}) => {
  const chars = str.split("");

  const nodes = chars.map((char, i) => {
    if (indices.has(i + offset)) {
      return (
        <Typography component="b" key={i} variant="inherit" color={color ?? "info.main"}>
          {char}
        </Typography>
      );
    }
    return char;
  });

  return <>{nodes}</>;
};

const StyledAppBar = muiStyled(AppBar)(({ theme }) => ({
  top: 0,
  zIndex: theme.zIndex.appBar - 1,
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: `0 -1px 0 ${theme.palette.divider}`,
}));

const StyledListItem = muiStyled(ListItem)({
  "@media (pointer: fine)": {
    "& .MuiListItemSecondaryAction-root": {
      visibility: "hidden",
    },
    "&:hover": {
      "& .MuiListItemSecondaryAction-root": {
        visibility: "visible",
      },
    },
  },
});

export default function DataSourceSidebar(props: Props): JSX.Element {
  const { onSelectDataSourceAction } = props;
  const [enableOpenDialog] = useAppConfigurationValue(AppSetting.OPEN_DIALOG);
  const [showDatatype, setShowDatatype] = useState<boolean>(true);
  const [filterAnchorEl, setFilterAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const [filterText, setFilterText] = useState<string>("");
  const filterOpen = Boolean(filterAnchorEl);

  const handleFilterClick = (event: MouseEvent<HTMLButtonElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };
  const handleFilterClose = () => {
    setFilterAnchorEl(undefined);
  };
  const modalHost = useContext(ModalContext);

  const playerProblems =
    useMessagePipeline((ctx: MessagePipelineContext) => ctx.playerState.problems) ?? [];
  const topics = useMessagePipeline((ctx) => ctx.playerState.activeData?.topics ?? []);

  const filteredTopics: FzfResultItem<Topic>[] = useMemo(
    () =>
      filterText
        ? new Fzf(topics, {
            fuzzy: filterText.length > 2 ? "v2" : false,
            sort: true,
            selector: (topic) => `${topic.name}|${topic.datatype}`,
          }).find(filterText)
        : topics.map((t) => itemToFzfResult(t)),
    [filterText, topics],
  );

  const showProblemModal = useCallback(
    (problem: PlayerProblem) => {
      const remove = modalHost.addModalElement(
        <NotificationModal
          notification={{
            message: problem.message,
            subText: problem.tip,
            details: problem.error,
            severity: problem.severity,
          }}
          onRequestClose={() => remove()}
        />,
      );
    },
    [modalHost],
  );

  return (
    <SidebarContent
      title="Data source"
      helpContent={helpContent}
      disablePadding
      trailingItems={[
        enableOpenDialog === true && (
          <IconButton
            key="add-connection"
            color="primary"
            title="New connection"
            onClick={onSelectDataSourceAction}
          >
            <AddIcon />
          </IconButton>
        ),
      ].filter(Boolean)}
    >
      <Stack fullHeight>
        <Box paddingX={2} paddingBottom={2}>
          <DataSourceInfo />
        </Box>

        <Stack flex={1}>
          <StyledAppBar position="sticky" color="default" elevation={0}>
            <Stack direction="row" padding={1} gap={1} alignItems="center">
              <Box flex="auto">
                <TextField
                  onChange={(event) => setFilterText(event.target.value)}
                  value={filterText}
                  variant="filled"
                  fullWidth
                  placeholder="Filter by topic or datatype"
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" />,
                    endAdornment: filterText && (
                      <IconButton
                        size="small"
                        title="Clear search"
                        onClick={() => setFilterText("")}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Box>
              <IconButton title="Toggle datatype" onClick={() => setShowDatatype(!showDatatype)}>
                {showDatatype ? (
                  <VisibilityIcon fontSize="small" />
                ) : (
                  <VisibilityOffIcon fontSize="small" />
                )}
              </IconButton>
              <IconButton
                id="basic-button"
                aria-controls={filterOpen ? "filter-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={filterOpen ? "true" : undefined}
                onClick={handleFilterClick}
              >
                <FilterListIcon fontSize="small" />
              </IconButton>
              <Menu
                id="filter-menu"
                anchorEl={filterAnchorEl}
                open={filterOpen}
                onClose={handleFilterClose}
                MenuListProps={{
                  "aria-labelledby": "filter-button",
                }}
              >
                <MenuItem onClick={handleFilterClose}>Sort Alphabetically</MenuItem>
              </Menu>
            </Stack>
          </StyledAppBar>
          {filteredTopics.length > 0 ? (
            <List dense disablePadding>
              {filteredTopics.map(({ item, positions }) => (
                <StyledListItem divider key={item.name}>
                  <ListItemText
                    primary={<HighlightChars str={item.name} indices={positions} />}
                    secondary={
                      showDatatype && (
                        <HighlightChars
                          str={item.datatype}
                          indices={positions}
                          offset={item.name.length + 1}
                        />
                      )
                    }
                    primaryTypographyProps={{ variant: "body1" }}
                    secondaryTypographyProps={{
                      fontFamily: fonts.MONOSPACE,
                    }}
                  />
                </StyledListItem>
              ))}
            </List>
          ) : (
            <Stack flex="auto" padding={2}>
              Haz empty state
            </Stack>
          )}
        </Stack>

        {playerProblems.length > 0 && (
          <>
            <Divider />
            <List disablePadding>
              {playerProblems.map((problem, idx) => (
                <ListItem disablePadding key={`${idx}`}>
                  <ListItemButton onClick={() => showProblemModal(problem)}>
                    <ListItemIcon>
                      {problem.severity === "error" ? (
                        <ErrorIcon color="error" />
                      ) : (
                        <WarningIcon color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={problem.message}
                      primaryTypographyProps={{
                        color: problem.severity === "error" ? "error.main" : "warning.main",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Stack>
    </SidebarContent>
  );
}
