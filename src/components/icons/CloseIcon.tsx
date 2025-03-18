import { FC } from "react";
import { css, cx } from '../../../styled-system/css';
import { token } from "../../../styled-system/tokens";
import IconType from "../../@types/IconType";
import { iconRecipe } from '../../../styled-system/recipes'

const CloseIcon: FC<IconType> = ({
  size = 48,
  fill,
  cssRaw,
}) => {
  const fillColor = fill || token('colors.fg')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 27 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <path
        d="M3.46732 26.0418L0.958984 23.5335L10.9923 13.5002L0.958984 3.46683L3.46732 0.958496L13.5007 10.9918L23.534 0.958496L26.0423 3.46683L16.009 13.5002L26.0423 23.5335L23.534 26.0418L13.5007 16.0085L3.46732 26.0418Z"
        fill={fillColor}
      />
    </svg>
  );
};

export default CloseIcon;
