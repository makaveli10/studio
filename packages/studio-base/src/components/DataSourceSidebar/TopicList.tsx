// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import {
  AppBar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  styled as muiStyled,
  TextField,
  Typography,
  TypographyProps,
} from "@mui/material";
import cx from "classnames";
import { Fzf, FzfResultItem } from "fzf";
import { useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { Topic } from "@foxglove/studio";
import EyeClosedIcon from "@foxglove/studio-base/components/EyeClosedIcon";
import EyeOpenIcon from "@foxglove/studio-base/components/EyeOpenIcon";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Stack from "@foxglove/studio-base/components/Stack";
import { PlayerPresence } from "@foxglove/studio-base/players/types";
import { fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

const itemToFzfResult = (item: Topic) =>
  ({
    item,
    score: 0,
    positions: new Set<number>(),
    start: 0,
    end: 0,
  } as FzfResultItem<Topic>);

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
  display: "flex",
  flexDirection: "row",
  padding: theme.spacing(1),
  gap: theme.spacing(1),
  alignItems: "center",
}));

const StyledListItem = muiStyled(ListItem)(({ theme }) => ({
  ".MuiListItemSecondaryAction-root": {
    marginRight: theme.spacing(-0.75),
  },
  "@media (pointer: fine)": {
    ".MuiListItemSecondaryAction-root": {
      visibility: "hidden",
    },
    "&:hover, &.Mui-hasMenu": {
      paddingRight: theme.spacing(11),

      ".MuiListItemSecondaryAction-root": {
        visibility: "visible",
      },
    },
  },
}));

const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;

export function TopicList(): JSX.Element {
  const [showDatatype, setShowDatatype] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>("");
  const [clipboard, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const [menuTopic, setMenuTopic] = useState<number | undefined>(undefined);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>, value: number) => {
    setMenuTopic(value);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setMenuTopic(undefined);
    setAnchorEl(undefined);
  };

  const playerPresence = useMessagePipeline(selectPlayerPresence);
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

  return (
    <>
      <StyledAppBar position="sticky" color="default" elevation={0}>
        <Box flex="auto">
          <TextField
            disabled={playerPresence !== PlayerPresence.PRESENT}
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
        <IconButton
          disabled={playerPresence !== PlayerPresence.PRESENT}
          title={`${showDatatype ? "Show" : "Hide"} datatype`}
          onClick={() => setShowDatatype(!showDatatype)}
        >
          {showDatatype ? <EyeOpenIcon /> : <EyeClosedIcon color="disabled" />}
        </IconButton>
      </StyledAppBar>
      {playerPresence === PlayerPresence.PRESENT ? (
        filteredTopics.length > 0 ? (
          <List dense={showDatatype} disablePadding>
            {filteredTopics.map(({ item, positions }, idx) => (
              <StyledListItem
                className={cx({ "Mui-hasMenu": menuTopic === idx })}
                divider
                key={item.name}
                secondaryAction={
                  <Stack direction="row" gap={0.5} alignItems="center">
                    <IconButton
                      title={copied ? "Copied!" : "Copy topic name"}
                      color={copied ? "success" : "inherit"}
                      onClick={() => {
                        copyToClipboard(item.name);

                        if (!clipboard.error) {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1000);
                        }
                      }}
                    >
                      {copied ? (
                        <CheckIcon fontSize="small" />
                      ) : (
                        <ContentPasteIcon fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      id={`${idx}-more-button`}
                      aria-label="more"
                      aria-controls={open ? "topic-menu" : undefined}
                      aria-expanded={open ? "true" : undefined}
                      aria-haspopup="true"
                      onClick={(event) => handleClick(event, idx)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={<HighlightChars str={item.name} indices={positions} />}
                  primaryTypographyProps={{ variant: "body2", noWrap: true, title: item.name }}
                  secondary={
                    showDatatype && (
                      <HighlightChars
                        str={item.datatype}
                        indices={positions}
                        offset={item.name.length + 1}
                      />
                    )
                  }
                  secondaryTypographyProps={{
                    fontFamily: fonts.MONOSPACE,
                    noWrap: true,
                    title: item.datatype,
                  }}
                />
              </StyledListItem>
            ))}
          </List>
        ) : (
          <Stack flex="auto" padding={2}>
            Haz empty state
          </Stack>
        )
      ) : (
        [...new Array(10).fill({})].map((i) => (
          <ListItem divider key={i}>
            <ListItemText
              primary={<Skeleton animation={false} width="20%" />}
              secondary={<Skeleton animation="wave" width="55%" />}
            />
          </ListItem>
        ))
      )}
      <Menu
        id="topic-menu"
        MenuListProps={{
          "aria-labelledby": `${menuTopic}-more-button`,
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 180 },
        }}
      >
        <MenuItem onClick={handleClose}>
          <Box flex="auto">Open in…</Box>
        </MenuItem>
      </Menu>
    </>
  );
}
