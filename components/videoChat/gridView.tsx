import { bind } from "lodash-decorators";
import { observer } from "mobx-react";
import JitsiConferenceManager from "../../lib/jitsiManager/jitsiConferenceManager";
import JitsiParticipant from "../../lib/jitsiManager/jitsiParticipant";
import React, { RefObject } from "react";
import Video from "./video";
import _chunk from "lodash/chunk";
import debounce from "lodash/debounce";

interface GridViewProps {
  conference: JitsiConferenceManager;
  localParticipant: JitsiParticipant;
  participants: JitsiParticipant[];
  crop: boolean;
}

@observer
export default class GridView extends React.Component<GridViewProps> {
  private gridDimensions?: { columns: number; rows: number };
  private viewContainerRef: RefObject<HTMLDivElement>;
  private handleGrideResizeDebounced: () => void;

  constructor(props: GridViewProps) {
    super(props);

    this.viewContainerRef = React.createRef();
    this.handleGrideResizeDebounced = debounce(this.handleGridResize, 250);

    window.addEventListener("resize", this.handleGrideResizeDebounced);
  }

  componentDidMount(): void {
    this.handleGridResize();
  }

  componentDidUpdate(): void {
    this.handleGridResize();
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleGrideResizeDebounced);
  }

  @bind()
  handleGridResize(): void {
    if (this.viewContainerRef.current && this.gridDimensions) {
      this.updateVideoDimensions(this.gridDimensions, this.props.crop);
      this.calculateVideoConstraint();
    }
  }

  @bind()
  calculateVideoConstraint(): void {
    if (this.viewContainerRef.current) {
      const sampleVideoContainer = this.viewContainerRef.current.getElementsByClassName(
        "video"
      )[0] as HTMLVideoElement;

      if (sampleVideoContainer) {
        const elementHeight = sampleVideoContainer.offsetHeight;
        let videoConstraint;

        // TODO: these are okay values for wide video but not for cropped vertical video
        if (elementHeight < 180) {
          videoConstraint = 180;
        } else if (elementHeight < 500) {
          videoConstraint = 360;
        } else if (elementHeight < 1000) {
          videoConstraint = 720;
        } else {
          videoConstraint = 1080;
        }

        console.log("calculateVideoConstraint", elementHeight, videoConstraint);

        this.props.conference.selectAllParticipants();
        this.props.conference.setReceiverVideoConstraint(videoConstraint);
      }
    } else {
      console.warn("Can't update videoContraint. viewContainerRef is undefined.");
    }
  }

  getGridDimensions(count: number): { columns: number; rows: number } {
    const sqrt = Math.sqrt(count);
    const rows = Math.ceil(sqrt);
    const columns = sqrt === rows || sqrt - Math.floor(sqrt) >= 0.5 ? rows : rows - 1;

    return { columns, rows };
  }

  updateVideoDimensions(
    gridDimensions: { columns: number; rows: number },
    crop = false,
    aspectRatio = 16 / 9,
    videoMargin = 5,
    controlsHeight = 55
  ): void {
    if (this.viewContainerRef.current) {
      let containerHeight = this.viewContainerRef.current.offsetHeight;
      let containerWidth = this.viewContainerRef.current.offsetWidth;
      const combinedMargin = videoMargin * 2;

      // Remove margin from the container calculation
      containerHeight = containerHeight - combinedMargin - controlsHeight;
      containerWidth = containerWidth - combinedMargin;

      let height: number, width: number;

      // Fill all the available space
      if (crop) {
        height = containerHeight / gridDimensions.rows;
        width = containerWidth / gridDimensions.columns;
        // Keep aspect ratio
      } else {
        // Try landscape first
        width = containerWidth / gridDimensions.columns;
        height = width / aspectRatio;

        // If it's too tall then use portrait orientation
        if (height * gridDimensions.rows > containerHeight) {
          height = containerHeight / gridDimensions.rows;
          width = height * aspectRatio;
        }
      }

      // Adjust video size to account for margin
      height = height - combinedMargin;
      width = width - combinedMargin;

      this.viewContainerRef.current.style.setProperty("--video-height", `${height}px`);
      this.viewContainerRef.current.style.setProperty("--video-width", `${width}px`);
      this.viewContainerRef.current.style.setProperty("--video-margin", `${videoMargin}px`);
    } else {
      console.warn("Can't update video dimensions. viewContainerRef is undefined.");
    }
  }

  getCssClassNames(): string {
    const classNames = ["gridView"];

    classNames.push(this.props.crop ? "cropped" : "uncropped");

    if (this.props.participants.length === 1) {
      classNames.push("oneToOne");
    }

    return classNames.join(" ");
  }

  render(): JSX.Element {
    const { participants, localParticipant } = this.props;
    const allParticipants = [...participants, localParticipant];

    // Save dimensions so we can calulate video dimensions after render
    this.gridDimensions = this.getGridDimensions(allParticipants.length);

    const participantChunks = _chunk(allParticipants, this.gridDimensions.columns);

    return (
      <div className="videoChatViewContainer" ref={this.viewContainerRef}>
        <div className={this.getCssClassNames()}>
          {participantChunks.map((participants, chunkIndex) => (
            <div key={`row-${chunkIndex}`} className="row">
              {participants.map((participant) => (
                <Video
                  key={participant.id}
                  participant={participant}
                  isLocal={participant.isLocal}
                  audioTrack={participant.audioTrack}
                  videoTrack={participant.videoTrack}
                  isAudioMuted={participant.isAudioMuted}
                  isVideoMuted={participant.isVideoMuted}
                  isDominantSpeaker={participant.isDominantSpeaker}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
}
