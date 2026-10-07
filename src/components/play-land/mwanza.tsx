import { Platform } from "react-native";
import Kilimanjaro from "./kilimanjaro";

type MwanzaProps = {
  onOverviewVisibilityChange?: (visible: boolean) => void;
  onRoundStart?: (started: boolean) => void;
};

export default function Mwanza({
  onOverviewVisibilityChange,
  onRoundStart,
}: MwanzaProps) {
  const backgroundSource = Platform.OS === "web"
    ? require("../../assets/lands/mwanza-web.png")
    : require("../../assets/lands/mwanza.png");

  return (
    <Kilimanjaro
      onOverviewVisibilityChange={onOverviewVisibilityChange}
      onRoundStart={onRoundStart}
      backgroundSource={backgroundSource}
      panelSource={require("../../assets/lands/mwanza/paper-board.png")}
      answerBoardSource={require("../../assets/lands/mwanza/paper-answer-board.png")}
      timerSource={require("../../assets/lands/mwanza/paper-timer.png")}
      timerScale={0.45}
      timerContentOffsetY={-50}
      panelScale={0.55}
      panelHeightScale={1.2}
      panelOffsetY={255}
      panelContentOffsetY={-260}
      showTreeAndBranch={false}
    />
  );
}