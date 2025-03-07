import { Category, Task } from "../types/user";
import { ReactNode, useContext, useEffect, useState } from "react";
import { calculateDateDifference, formatDate, getFontColorFromHex, iOS } from "../utils";
import {
  CancelRounded,
  Close,
  Delete,
  DoneAll,
  DoneRounded,
  Link,
  MoreVert,
  PushPinRounded,
  RadioButtonChecked,
  RadioButtonUnchecked,
  Search,
} from "@mui/icons-material";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { Emoji, EmojiStyle } from "emoji-picker-react";
import { CategoryBadge, EditTask, TaskMenu } from ".";
import {
  CategoriesListContainer,
  ColorPalette,
  DialogBtn,
  EmojiContainer,
  HighlightedText,
  NoTasks,
  Pinned,
  RingAlarm,
  SearchInput,
  SelectedTasksContainer,
  ShowMoreBtn,
  StyledRadio,
  TaskComponent,
  TaskDate,
  TaskDescription,
  TaskHeader,
  TaskInfo,
  TaskName,
  TasksContainer,
  TimeLeft,
} from "../styles";
import toast from "react-hot-toast";
import { useResponsiveDisplay } from "../hooks/useResponsiveDisplay";
import { UserContext } from "../contexts/UserContext";
import { useStorageState } from "../hooks/useStorageState";
import { DESCRIPTION_SHORT_LENGTH } from "../constants";
import { useCtrlS } from "../hooks/useCtrlS";

/**
 * Component to display a list of tasks.
 */

export const Tasks: React.FC = () => {
  const { user, setUser } = useContext(UserContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [search, setSearch] = useStorageState<string>("", "search", "sessionStorage");
  //FIXME: use storage state for set
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);

  const [selectedTasks, setSelectedTasks] = useStorageState<number[]>(
    [],
    "selectedTasks",
    "sessionStorage"
  );

  const isMobile = useResponsiveDisplay();

  useCtrlS();

  // Handler for clicking the more options button in a task
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, taskId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedTaskId(taskId);
    if (!isMobile && !expandedTasks.has(taskId)) {
      toggleShowMore(taskId);
    }
  };

  const handleCloseMoreMenu = () => {
    setAnchorEl(null);
    document.body.style.overflow = "visible";
    if (selectedTaskId && !isMobile && expandedTasks.has(selectedTaskId)) {
      toggleShowMore(selectedTaskId);
    }
  };

  const reorderTasks = (tasks: Task[]): Task[] => {
    // Reorders tasks by moving pinned tasks to the top
    let pinnedTasks = tasks.filter((task) => task.pinned);
    let unpinnedTasks = tasks.filter((task) => !task.pinned);

    // Filter tasks based on the selected category
    if (selectedCatId !== undefined) {
      unpinnedTasks = unpinnedTasks.filter((task) => {
        if (task.category) {
          return task.category.some((category) => category.id === selectedCatId);
        }
        return false;
      });
      pinnedTasks = pinnedTasks.filter((task) => {
        if (task.category) {
          return task.category.some((category) => category.id === selectedCatId);
        }
        return false;
      });
    }

    // Filter tasks based on the search input
    const searchLower = search.toLowerCase();
    unpinnedTasks = unpinnedTasks.filter(
      (task) =>
        task.name.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
    );
    pinnedTasks = pinnedTasks.filter(
      (task) =>
        task.name.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
    );

    // move done tasks to bottom
    if (user.settings[0]?.doneToBottom) {
      const doneTasks = unpinnedTasks.filter((task) => task.done);
      const notDoneTasks = unpinnedTasks.filter((task) => !task.done);
      return [...pinnedTasks, ...notDoneTasks, ...doneTasks];
    }

    return [...pinnedTasks, ...unpinnedTasks];
  };

  const handleDeleteTask = () => {
    // Opens the delete task dialog

    if (selectedTaskId) {
      setDeleteDialogOpen(true);
    }
  };
  const confirmDeleteTask = () => {
    // Deletes the selected task

    if (selectedTaskId) {
      const updatedTasks = user.tasks.filter((task) => task.id !== selectedTaskId);
      setUser((prevUser) => ({
        ...prevUser,
        tasks: updatedTasks,
      }));

      setDeleteDialogOpen(false);
      toast.success((t) => (
        <div onClick={() => toast.dismiss(t.id)}>
          Deleted Task - <b>{user.tasks.find((task) => task.id === selectedTaskId)?.name}</b>
        </div>
      ));
    }
  };
  const cancelDeleteTask = () => {
    // Cancels the delete task operation
    setDeleteDialogOpen(false);
  };

  const handleEditTask = (
    taskId: number,
    newName: string,
    newColor: string,
    newEmoji?: string,
    newDescription?: string,
    newDeadline?: Date,
    newCategory?: Category[]
  ) => {
    // Update the selected task with the new values
    const updatedTasks = user.tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          name: newName,
          color: newColor,
          emoji: newEmoji,
          description: newDescription,
          deadline: newDeadline,
          category: newCategory,
          lastSave: new Date(),
        };
      }
      return task;
    });
    // Update the user object with the updated tasks
    setUser((prevUser) => ({
      ...prevUser,
      tasks: updatedTasks,
    }));
  };

  const handleSelectTask = (taskId: number) => {
    setAnchorEl(null);
    setSelectedTasks((prevSelectedTaskIds) => {
      if (prevSelectedTaskIds.includes(taskId)) {
        // Deselect the task if already selected
        return prevSelectedTaskIds.filter((id) => id !== taskId);
      } else {
        // Select the task if not selected
        return [...prevSelectedTaskIds, taskId];
      }
    });
  };

  const handleMarkSelectedAsDone = () => {
    setUser((prevUser) => ({
      ...prevUser,
      tasks: prevUser.tasks.map((task) => {
        if (selectedTasks.includes(task.id)) {
          // Mark the task as done if selected
          return { ...task, done: true };
        }
        return task;
      }),
    }));
    // Clear the selected task IDs after the operation
    setSelectedTasks([]);
  };

  const handleDeleteSelected = () => {
    setUser((prevUser) => ({
      ...prevUser,
      tasks: prevUser.tasks.filter((task) => !selectedTasks.includes(task.id)),
    }));
    // Clear the selected task IDs after the operation
    setSelectedTasks([]);
  };

  const [categories, setCategories] = useState<Category[] | undefined>(undefined);

  const [selectedCatId, setSelectedCatId] = useStorageState<number | undefined>(
    undefined,
    "selectedCategory",
    "sessionStorage"
  );

  const [categoryCounts, setCategoryCounts] = useState<{
    [categoryId: number]: number;
  }>({});

  useEffect(() => {
    const tasks: Task[] = reorderTasks(user.tasks);
    const uniqueCategories: Category[] = [];

    tasks.forEach((task) => {
      if (task.category) {
        task.category.forEach((category) => {
          if (!uniqueCategories.some((c) => c.id === category.id)) {
            uniqueCategories.push(category);
          }
        });
      }
    });

    // Calculate category counts
    const counts: { [categoryId: number]: number } = {};
    uniqueCategories.forEach((category) => {
      const categoryTasks = tasks.filter((task) =>
        task.category?.some((cat) => cat.id === category.id)
      );
      counts[category.id] = categoryTasks.length;
    });

    // Sort categories based on count
    uniqueCategories.sort((a, b) => {
      const countA = counts[a.id] || 0;
      const countB = counts[b.id] || 0;
      return countB - countA;
    });

    setCategories(uniqueCategories);
    setCategoryCounts(counts);
  }, [user.tasks, search]);

  const toggleShowMore = (taskId: number) => {
    setExpandedTasks((prevExpandedTasks) => {
      const newSet = new Set(prevExpandedTasks);
      newSet.has(taskId) ? newSet.delete(taskId) : newSet.add(taskId);
      return newSet;
    });
  };

  const highlightMatchingText = (text: string, search: string): ReactNode => {
    if (!search) {
      return text;
    }

    const parts = text.split(new RegExp(`(${search})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <HighlightedText key={index}>{part}</HighlightedText>
      ) : (
        part
      )
    );
  };
  const checkOverdueTasks = (tasks: Task[]) => {
    const overdueTasks = tasks.filter((task) => {
      return task.deadline && new Date() > new Date(task.deadline) && !task.done;
    });

    if (overdueTasks.length > 0) {
      const taskNames = overdueTasks.map((task) => task.name);
      const formatTasksArray = new Intl.ListFormat("en-US", {
        style: "long",
        type: "conjunction",
      });

      toast.error(
        (t) => (
          <div
            translate="no"
            onClick={() => toast.dismiss(t.id)}
            style={{ wordBreak: "break-word" }}
          >
            <b translate="yes">Overdue task{overdueTasks.length > 1 && "s"}: </b>
            {formatTasksArray.format(taskNames)}
          </div>
        ),
        {
          duration: 3400,
          icon: <RingAlarm animate sx={{ color: ColorPalette.red }} />,
        }
      );
    }
  };

  useEffect(() => {
    checkOverdueTasks(user.tasks);
  }, []);

  return (
    <>
      <TaskMenu
        selectedTaskId={selectedTaskId}
        selectedTasks={selectedTasks}
        setEditModalOpen={setEditModalOpen}
        anchorEl={anchorEl}
        handleDeleteTask={handleDeleteTask}
        handleCloseMoreMenu={handleCloseMoreMenu}
        handleSelectTask={handleSelectTask}
      />
      <TasksContainer>
        {user.tasks.length > 0 && (
          <SearchInput
            focused
            color="primary"
            placeholder="Search for task..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "white" }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    sx={{
                      transition: ".3s all",
                      color:
                        reorderTasks(user.tasks).length === 0 && user.tasks.length > 0
                          ? ColorPalette.red
                          : "white",
                    }}
                    onClick={() => setSearch("")}
                  >
                    <Close />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />
        )}
        {categories !== undefined &&
          categories?.length > 0 &&
          user.settings[0].enableCategories && (
            <CategoriesListContainer>
              {categories?.map((cat) => (
                <CategoryBadge
                  key={cat.id}
                  category={cat}
                  emojiSizes={[24, 20]}
                  list
                  label={
                    <div>
                      <span style={{ fontWeight: "bold" }}>{cat.name}</span>
                      <span
                        style={{
                          fontSize: "14px",
                          opacity: 0.9,
                          marginLeft: "4px",
                        }}
                      >
                        ({categoryCounts[cat.id] || 0})
                      </span>
                    </div>
                  }
                  onClick={() =>
                    selectedCatId !== cat.id
                      ? setSelectedCatId(cat.id)
                      : setSelectedCatId(undefined)
                  }
                  onDelete={
                    selectedCatId === cat.id ? () => setSelectedCatId(undefined) : undefined
                  }
                  sx={{
                    boxShadow: "none",
                    display:
                      selectedCatId === undefined || selectedCatId === cat.id
                        ? "inline-flex"
                        : "none",
                    p: "20px 14px",
                    fontSize: "16px",
                  }}
                />
              ))}
            </CategoriesListContainer>
          )}
        {selectedTasks.length > 0 && (
          <SelectedTasksContainer>
            <div>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center" }}>
                <RadioButtonChecked /> &nbsp; Selected {selectedTasks.length} task
                {selectedTasks.length > 1 ? "s" : ""}
              </h3>
              <span style={{ fontSize: "14px", opacity: 0.8 }}>
                {new Intl.ListFormat("en", {
                  style: "long",
                  type: "conjunction",
                }).format(
                  selectedTasks
                    .map((taskId) => user.tasks.find((task) => task.id === taskId)?.name)
                    .filter((taskName) => taskName !== undefined) as string[]
                )}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Tooltip title="Mark selected as done">
                <IconButton sx={{ color: "white" }} size="large" onClick={handleMarkSelectedAsDone}>
                  <DoneAll />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete selected">
                <IconButton color="error" size="large" onClick={handleDeleteSelected}>
                  <Delete />
                </IconButton>
              </Tooltip>
              <Tooltip sx={{ color: "white" }} title="Cancel">
                <IconButton size="large" onClick={() => setSelectedTasks([])}>
                  <CancelRounded />
                </IconButton>
              </Tooltip>
            </div>
          </SelectedTasksContainer>
        )}
        {search && reorderTasks(user.tasks).length > 0 && user.tasks.length > 0 && (
          <div
            style={{
              textAlign: "center",
              fontSize: "18px",
              opacity: 0.9,
              marginTop: "12px",
            }}
          >
            <b>
              Found {reorderTasks(user.tasks).length} task
              {reorderTasks(user.tasks).length > 1 ? "s" : ""}
            </b>
          </div>
        )}
        {user.tasks.length !== 0 ? (
          reorderTasks(user.tasks).map((task) => (
            <TaskComponent
              key={task.id}
              id={task.id.toString()}
              backgroundColor={task.color}
              clr={getFontColorFromHex(task.color)}
              glow={user.settings[0].enableGlow}
              done={task.done}
              blur={selectedTaskId !== task.id && open && !isMobile}
            >
              {selectedTasks.length > 0 && (
                <StyledRadio
                  clr={getFontColorFromHex(task.color)}
                  checked={selectedTasks.includes(task.id)}
                  icon={<RadioButtonUnchecked />}
                  checkedIcon={<RadioButtonChecked />}
                  onChange={() => {
                    if (selectedTasks.includes(task.id)) {
                      setSelectedTasks((prevTasks) => prevTasks.filter((id) => id !== task.id));
                    } else {
                      handleSelectTask(task.id);
                    }
                  }}
                />
              )}
              {task.emoji || task.done ? (
                <EmojiContainer
                  clr={getFontColorFromHex(task.color)}
                  // onDoubleClick={() => handleSelectTask(task.id)}
                >
                  {task.done ? (
                    <DoneRounded fontSize="large" />
                  ) : user.emojisStyle === EmojiStyle.NATIVE ? (
                    <div>
                      <Emoji
                        size={iOS ? 48 : 36}
                        unified={task.emoji || ""}
                        emojiStyle={EmojiStyle.NATIVE}
                      />
                    </div>
                  ) : (
                    <Emoji size={48} unified={task.emoji || ""} emojiStyle={user.emojisStyle} />
                  )}
                </EmojiContainer>
              ) : null}
              <TaskInfo translate="no">
                {task.pinned && (
                  <Pinned translate="yes">
                    <PushPinRounded fontSize="small" /> &nbsp; Pinned
                  </Pinned>
                )}
                <TaskHeader>
                  <TaskName done={task.done}>{highlightMatchingText(task.name, search)}</TaskName>
                  <Tooltip
                    title={`Created at: ${new Date(task.date).toLocaleDateString()} • ${new Date(
                      task.date
                    ).toLocaleTimeString()}`}
                  >
                    <TaskDate>{formatDate(new Date(task.date))}</TaskDate>
                  </Tooltip>
                </TaskHeader>
                <TaskDescription done={task.done}>
                  {highlightMatchingText(
                    expandedTasks.has(task.id) || !task.description
                      ? task.description || ""
                      : task.description?.slice(0, DESCRIPTION_SHORT_LENGTH) || "",
                    search
                  )}
                  {(!open || task.id !== selectedTaskId || isMobile) &&
                    task.description &&
                    task.description.length > DESCRIPTION_SHORT_LENGTH && (
                      <ShowMoreBtn onClick={() => toggleShowMore(task.id)} clr={task.color}>
                        {expandedTasks.has(task.id) ? "Show less" : "Show more"}
                      </ShowMoreBtn>
                    )}
                </TaskDescription>
                {task.deadline && (
                  <TimeLeft done={task.done}>
                    <RingAlarm
                      fontSize="small"
                      animate={new Date() > new Date(task.deadline) && !task.done}
                      sx={{
                        color: `${getFontColorFromHex(task.color)} !important`,
                      }}
                    />{" "}
                    &nbsp;
                    {new Date(task.deadline).toLocaleDateString()} {" • "}
                    {new Date(task.deadline).toLocaleTimeString()}
                    {!task.done && (
                      <>
                        {" • "}
                        {calculateDateDifference(new Date(task.deadline))}
                      </>
                    )}
                  </TimeLeft>
                )}
                {task.sharedBy && (
                  <div style={{ opacity: 0.8, display: "flex", alignItems: "center", gap: "4px" }}>
                    <Link /> Shared by {task.sharedBy}
                    {/* <Chip
                      avatar={<Avatar>{task.sharedBy[0]}</Avatar>}
                      label={task.sharedBy}
                      sx={{ background: "white" }}
                    /> */}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px 6px",
                    justifyContent: "left",
                    alignItems: "center",
                  }}
                >
                  {task.category &&
                    user.settings[0].enableCategories !== undefined &&
                    user.settings[0].enableCategories &&
                    task.category.map((category) => (
                      <div key={category.id}>
                        <CategoryBadge
                          category={category}
                          borderclr={getFontColorFromHex(task.color)}
                        />
                      </div>
                    ))}
                </div>
              </TaskInfo>
              <IconButton
                aria-label="Task Menu"
                aria-controls={open ? "task-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
                onClick={(event) => handleClick(event, task.id)}
                sx={{ color: getFontColorFromHex(task.color) }}
              >
                <MoreVert />
              </IconButton>
            </TaskComponent>
          ))
        ) : (
          <NoTasks>
            <b>You don't have any tasks yet</b>
            <br />
            Click on the <b>+</b> button to add one
          </NoTasks>
        )}
        {search && reorderTasks(user.tasks).length === 0 && user.tasks.length > 0 && (
          <div
            style={{
              textAlign: "center",
              fontSize: "18px",
              opacity: 0.9,
              marginTop: "18px",
            }}
          >
            <b>No tasks found</b>
            <br />
            Try searching with different keywords.
          </div>
        )}
        <EditTask
          open={editModalOpen}
          task={user.tasks.find((task) => task.id === selectedTaskId)}
          onClose={() => setEditModalOpen(false)}
          onSave={(editedTask) => {
            handleEditTask(
              editedTask.id,
              editedTask.name,
              editedTask.color,
              editedTask.emoji || undefined,
              editedTask.description || undefined,
              editedTask.deadline || undefined,
              editedTask.category || undefined
            );
            setEditModalOpen(false);
          }}
        />
      </TasksContainer>
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDeleteTask}
        PaperProps={{
          style: {
            borderRadius: "28px",
            padding: "10px",
          },
        }}
      >
        <DialogTitle>Are you sure you want to delete the task?</DialogTitle>
        <DialogContent>
          {user.tasks.find((task) => task.id === selectedTaskId)?.emoji !== undefined && (
            <p
              style={{
                display: "flex",
                justifyContent: "left",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <b>Emoji:</b>{" "}
              <Emoji
                size={28}
                emojiStyle={user.emojisStyle}
                unified={user.tasks.find((task) => task.id === selectedTaskId)?.emoji || ""}
              />
            </p>
          )}
          <p>
            <b>Task Name:</b> {user.tasks.find((task) => task.id === selectedTaskId)?.name}
          </p>
          {user.tasks.find((task) => task.id === selectedTaskId)?.description !== undefined && (
            <p>
              <b>Task Description:</b>{" "}
              {user.tasks.find((task) => task.id === selectedTaskId)?.description}
            </p>
          )}

          {selectedTaskId !== null &&
            user.tasks.find((task) => task.id === selectedTaskId)?.category?.[0]?.name !==
              undefined && (
              <p>
                <b>Category:</b>{" "}
                {user.tasks
                  .find((task) => task.id === selectedTaskId)
                  ?.category?.map((cat) => cat.name)
                  .join(", ")}
              </p>
            )}
        </DialogContent>
        <DialogActions>
          <DialogBtn onClick={cancelDeleteTask} color="primary">
            Cancel
          </DialogBtn>
          <DialogBtn onClick={confirmDeleteTask} color="error">
            Delete
          </DialogBtn>
        </DialogActions>
      </Dialog>
    </>
  );
};
