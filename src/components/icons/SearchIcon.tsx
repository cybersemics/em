
import { FC } from 'react';
import { css, cx } from '../../../styled-system/css';
import { token } from '../../../styled-system/tokens';
import IconType from "../../@types/IconType";
import { iconRecipe } from '../../../styled-system/recipes';

const SearchIcon: FC<IconType> = ({
  size = 48,
  fill,
  cssRaw,
}) => {
  const fillColor = fill || token('colors.fg')

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 54 56"
      width={size}
      height={size}
      fill={fillColor}
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="54" height="56" viewBox="0 0 54 56">
        <path id="Path" fill={fillColor} stroke="none" d="M 21.4529 0.480957 C 9.59269 0.480957 0 10.1049 0 22.0037 C 0 33.902599 9.59269 43.526501 21.4529 43.526501 C 25.6873 43.526501 29.606199 42.280201 32.928699 40.163601 L 48.4268 55.7122 L 53.7901 50.331501 L 38.489101 35.020302 C 41.2397 31.4002 42.905899 26.9146 42.905899 22.0037 C 42.905899 10.1049 33.313202 0.480957 21.4529 0.480957 Z M 21.4529 5.545139 C 30.537901 5.545139 37.858101 12.889198 37.858101 22.0037 C 37.858101 31.118299 30.537901 38.462299 21.4529 38.462299 C 12.368 38.462299 5.04775 31.118299 5.04775 22.0037 C 5.04775 12.889198 12.368 5.545139 21.4529 5.545139 Z" />
        </svg>
    </svg>
  );
};

export default SearchIcon;
