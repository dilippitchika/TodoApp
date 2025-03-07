import styled from "@emotion/styled";
import { Button, TextField } from "@mui/material";
import { ColorPalette } from ".";
import { getFontColorFromHex } from "../utils";

export const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

export const Input = styled.input`
  font-size: 24px;
  border: none;
  width: 400px;
  padding: 16px;
  border-radius: 20px;
  background-color: #ffffffd8;
  border: 4px solid #7614ff;
  color: #212121;
  &::placeholder {
    color: #212121;
  }
`;

export const AddTaskButton = styled(Button)`
  margin-top: 4px;
  border: none;
  padding: 16px 32px;
  font-size: 24px;
  background: ${ColorPalette.purple};
  color: ${getFontColorFromHex(ColorPalette.purple)};
  border-radius: 999px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s all;
  margin: 20px;
  width: 400px;
  text-transform: capitalize;
  &:hover {
    box-shadow: 0px 0px 24px 0px ${ColorPalette.purple + 80};
    background: ${ColorPalette.purple};
  }
  &:disabled {
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.7;
    color: white;
  }
`;
export const StyledInput = styled(TextField)<{ helpercolor?: string }>`
  margin: 12px;
  & .MuiOutlinedInput-root {
    border-radius: 16px;
    transition: 0.3s all;
    width: 400px;
    color: white;
  }
  .MuiFormHelperText-root {
    color: ${({ helpercolor }) => helpercolor || "white"};
    opacity: 0.8;
  }
`;
