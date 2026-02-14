"""
ClioSnake Pro Edition
A refined implementation of the classic Snake game using Pygame.
Features: High score persistence, progressive difficulty, and neon aesthetics.
"""
import pygame
import time
import random
import os
import sys

# --- Configuration & Assets ---
WIDTH, HEIGHT = 800, 600
SNAKE_BLOCK = 20
INITIAL_SPEED = 10
SPEED_INCREMENT = 0.5
HI_SCORE_FILE = "snake_hiscore.txt"

# Colors (Neon Palette)
BG_COLOR = (10, 10, 15)
SNAKE_COLOR = (0, 255, 127)      # Spring Green
SNAKE_HEAD_COLOR = (0, 255, 255) # Cyan
FOOD_COLOR = (255, 0, 127)       # Rose
TEXT_COLOR = (240, 240, 240)
HIGHLIGHT_COLOR = (255, 215, 0)  # Gold

def get_hi_score():
    """Retrieves the high score from local storage."""
    if not os.path.exists(HI_SCORE_FILE):
        return 0
    try:
        with open(HI_SCORE_FILE, "r") as f:
            return int(f.read().strip())
    except (ValueError, IOError):
        return 0

def save_hi_score(score):
    """Saves high score if the current score exceeds it."""
    hi = get_hi_score()
    if score > hi:
        try:
            with open(HI_SCORE_FILE, "w") as f:
                f.write(str(score))
        except IOError as e:
            print(f"Error saving high score: {e}")

class SnakeGame:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption('ClioSnake: Pro Edition')
        self.clock = pygame.time.Clock()
        
        # Typography
        self.font_main = pygame.font.SysFont("segoe ui", 30, bold=True)
        self.font_small = pygame.font.SysFont("segoe ui", 20)
        self.font_score = pygame.font.SysFont("consolas", 25)

    def draw_snake(self, snake_list):
        """Renders the snake with rounded segments and head details."""
        for i, x in enumerate(snake_list):
            color = SNAKE_HEAD_COLOR if i == len(snake_list) - 1 else SNAKE_COLOR
            pygame.draw.rect(self.screen, color, [x[0], x[1], SNAKE_BLOCK, SNAKE_BLOCK], border_radius=6)
            if i == len(snake_list) - 1: # Head Detail
                pygame.draw.rect(self.screen, (255,255,255), [x[0]+4, x[1]+4, 4, 4], border_radius=2)

    def show_ui(self, score, hi_score, speed):
        """Displays the current session metrics."""
        s_text = self.font_score.render(f"SCORE: {score}", True, TEXT_COLOR)
        h_text = self.font_score.render(f"HI: {hi_score}", True, HIGHLIGHT_COLOR)
        v_text = self.font_score.render(f"SPD: {int(speed)}", True, (100, 100, 100))
        self.screen.blit(s_text, [10, 10])
        self.screen.blit(h_text, [WIDTH - 120, 10])
        self.screen.blit(v_text, [WIDTH // 2 - 40, 10])

    def message_screen(self, msg, submsg, color):
        """Utility for full-screen messages (Menus, Game Over, Pause)."""
        self.screen.fill(BG_COLOR)
        m_text = self.font_main.render(msg, True, color)
        s_text = self.font_small.render(submsg, True, TEXT_COLOR)
        
        m_rect = m_text.get_rect(center=(WIDTH/2, HEIGHT/2 - 20))
        s_rect = s_text.get_rect(center=(WIDTH/2, HEIGHT/2 + 30))
        
        self.screen.blit(m_text, m_rect)
        self.screen.blit(s_text, s_rect)
        pygame.display.update()

    def run(self):
        """Main entry point for the game."""
        while True:
            self.menu()
            self.game_loop()

    def menu(self):
        """Displays the start menu."""
        menu_active = True
        while menu_active:
            self.message_screen("CLIO SNAKE PRO", "Press [SPACE] to Initialize System or [Q] to Exit", SNAKE_HEAD_COLOR)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_SPACE:
                        menu_active = False
                    if event.key == pygame.K_q:
                        pygame.quit()
                        sys.exit()

    def game_loop(self):
        """Core gameplay logic."""
        game_close = False
        paused = False

        x1, y1 = WIDTH / 2, HEIGHT / 2
        dx, dy = 0, 0

        snake_list = []
        snake_len = 1
        current_speed = INITIAL_SPEED
        hi_score = get_hi_score()

        foodx = round(random.randrange(0, WIDTH - SNAKE_BLOCK) / 20.0) * 20.0
        foody = round(random.randrange(0, HEIGHT - SNAKE_BLOCK) / 20.0) * 20.0

        while True:
            while game_close:
                save_hi_score(snake_len - 1)
                self.message_screen("CRITICAL FAILURE", "Press [C] to Restart or [Q] to Menu", FOOD_COLOR)
                for event in pygame.event.get():
                    if event.type == pygame.QUIT:
                        pygame.quit()
                        sys.exit()
                    if event.type == pygame.KEYDOWN:
                        if event.key == pygame.K_q:
                            return # Go back to menu
                        if event.key == pygame.K_c:
                            self.game_loop() # This is still recursive, let's fix that.
                            return

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_LEFT and dx == 0:
                        dx, dy = -SNAKE_BLOCK, 0
                    elif event.key == pygame.K_RIGHT and dx == 0:
                        dx, dy = SNAKE_BLOCK, 0
                    elif event.key == pygame.K_UP and dy == 0:
                        dx, dy = 0, -SNAKE_BLOCK
                    elif event.key == pygame.K_DOWN and dy == 0:
                        dx, dy = 0, SNAKE_BLOCK
                    elif event.key == pygame.K_p:
                        paused = not paused

            if paused:
                self.message_screen("SYSTEM PAUSED", "Press [P] to Resume", HIGHLIGHT_COLOR)
                self.clock.tick(5)
                continue

            x1 += dx
            y1 += dy

            if x1 >= WIDTH or x1 < 0 or y1 >= HEIGHT or y1 < 0:
                game_close = True
                continue

            self.screen.fill(BG_COLOR)
            pygame.draw.circle(self.screen, FOOD_COLOR, (int(foodx + SNAKE_BLOCK/2), int(foody + SNAKE_BLOCK/2)), SNAKE_BLOCK/2)
            pygame.draw.circle(self.screen, (255, 255, 255), (int(foodx + SNAKE_BLOCK/2), int(foody + SNAKE_BLOCK/2)), 4)

            snake_head = [x1, y1]
            snake_list.append(snake_head)
            if len(snake_list) > snake_len:
                del snake_list[0]

            for segment in snake_list[:-1]:
                if segment == snake_head:
                    game_close = True

            if game_close:
                continue

            self.draw_snake(snake_list)
            self.show_ui(snake_len - 1, hi_score, current_speed)
            pygame.display.update()

            if x1 == foodx and y1 == foody:
                foodx = round(random.randrange(0, WIDTH - SNAKE_BLOCK) / 20.0) * 20.0
                foody = round(random.randrange(0, HEIGHT - SNAKE_BLOCK) / 20.0) * 20.0
                snake_len += 1
                current_speed += SPEED_INCREMENT

            self.clock.tick(current_speed)

if __name__ == "__main__":
    game = SnakeGame()
    game.run()
