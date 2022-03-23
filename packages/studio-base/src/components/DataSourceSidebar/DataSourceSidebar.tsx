// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Add24Regular as AddIcon } from "@fluentui/react-icons";
import { Box, IconButton, Tab, Tabs, styled as muiStyled, Chip, Badge } from "@mui/material";
import { useState, PropsWithChildren } from "react";

import { AppSetting } from "@foxglove/studio-base/AppSetting";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import { SidebarContent } from "@foxglove/studio-base/components/SidebarContent";
import Stack from "@foxglove/studio-base/components/Stack";
import { useAppConfigurationValue } from "@foxglove/studio-base/hooks/useAppConfigurationValue";
import { PlayerPresence } from "@foxglove/studio-base/players/types";

import { DataSourceInfo } from "./DataSourceInfo";
import { ProblemsList } from "./ProblemsList";
import { TopicList } from "./TopicList";
import helpContent from "./help.md";

type Props = {
  onSelectDataSourceAction: () => void;
};

const StyledTab = muiStyled(Tab)(({ theme }) => ({
  minWidth: "auto",
  minHeight: "auto",
  padding: theme.spacing(1.5, 2),
}));

const StyledTabs = muiStyled(Tabs)({
  minHeight: "auto",
});

interface TabPanelProps {
  index: number;
  value: number;
}

const TabPanel = (props: PropsWithChildren<TabPanelProps>): JSX.Element => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <>{children}</>}
    </div>
  );
};

const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;
const selectPlayerProblems = ({ playerState }: MessagePipelineContext) => playerState.problems;

export default function DataSourceSidebar(props: Props): JSX.Element {
  const { onSelectDataSourceAction } = props;
  const [enableOpenDialog] = useAppConfigurationValue(AppSetting.OPEN_DIALOG);
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const playerProblems = useMessagePipeline(selectPlayerProblems) ?? [];
  const [activeTab, setActiveTab] = useState<number>(0);

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
        <DataSourceInfo />

        {playerPresence !== PlayerPresence.NOT_PRESENT && (
          <Stack flex={1}>
            <StyledTabs
              value={activeTab}
              onChange={(_ev, newValue: number) => setActiveTab(newValue)}
              textColor="inherit"
            >
              <StyledTab disableRipple label="Topics" value={0} />
              {playerProblems.length > 0 && <StyledTab disableRipple label="Problems" value={1} />}
            </StyledTabs>
            <TabPanel value={activeTab} index={0}>
              <TopicList />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <ProblemsList problems={playerProblems} />
            </TabPanel>
          </Stack>
        )}
      </Stack>
    </SidebarContent>
  );
}
