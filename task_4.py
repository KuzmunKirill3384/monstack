import random
import math

# Матрица выигрышей
matrix = [[10, -3],
          [-2, 8]]


def generate_choice_from_box(box):
    """Генерация выбора на основе содержимого коробки"""
    total_balls = sum(box.values())
    threshold = box['red'] / total_balls
    return 0 if random.random() < threshold else 1


def update_box(box, color, change):
    """Обновление коробки в зависимости от результата"""
    box[color] += change
    box[color] = max(0, box[color])  # Шаров не может быть меньше 0


def play_game(box_a, box_b):
    """Одна игра между двумя игроками"""
    choice_a = generate_choice_from_box(box_a)
    choice_b = generate_choice_from_box(box_b)
    reward_a = matrix[choice_a][choice_b]
    reward_b = -reward_a
    return choice_a, choice_b, reward_a, reward_b


def probabilities(i, a_prob, b_prob):
    """Вероятности для ячейки"""
    if i == 0:
        return (1 - a_prob) * (1 - b_prob)
    elif i == 1:
        return (1 - a_prob) * b_prob
    elif i == 2:
        return a_prob * (1 - b_prob)
    elif i == 3:
        return a_prob * b_prob
    return 0


def train_with_dynamic_probabilities(box_a, box_b, n_games, update_condition):
    """Обучение с динамическими вероятностями"""
    for _ in range(n_games):
        a_prob = box_a['blue'] / sum(box_a.values())
        b_prob = box_b['blue'] / sum(box_b.values())
        row = 0 if random.random() < a_prob else 1
        column = 0 if random.random() < b_prob else 1
        result = matrix[row][column]

        if update_condition == "positive" and result > 0:
            update_box(box_a, 'red' if row == 0 else 'blue', result)
        elif update_condition == "negative" and result < 0:
            update_box(box_a, 'red' if row == 0 else 'blue', result)


def control_experiment(box_a, box_b, n_games):
    """Контрольный эксперимент"""
    results_a = []
    for _ in range(n_games):
        _, _, reward_a, _ = play_game(box_a, box_b)
        results_a.append(reward_a)

    mean_a = sum(results_a) / n_games
    variance_a = sum((x - mean_a) ** 2 for x in results_a) / n_games
    std_dev_a = math.sqrt(variance_a)

    return mean_a, variance_a, std_dev_a


def main():
    n_training_games = 1000
    n_control_games = 100

    # Задание 4.1 - Метод подкрепления (положительное изменение)
    box_a = {'red': 100, 'blue': 100}
    box_b = {'red': 100, 'blue': 100}
    train_with_dynamic_probabilities(box_a, box_b, n_training_games, "positive")
    mean_a, variance_a, std_dev_a = control_experiment(box_a, box_b, n_control_games)
    print("Задание 4.1 - Подкрепление:")
    print(f"Средний выигрыш игрока A: {mean_a}")
    print(f"Дисперсия: {variance_a}")
    print(f"Среднее квадратичное отклонение: {std_dev_a}")
    print(f"Шары: {box_a}")

    # Задание 4.2 - Метод наказания (отрицательное изменение)
    box_a = {'red': 1000, 'blue': 1000}
    box_b = {'red': 100, 'blue': 100}
    train_with_dynamic_probabilities(box_a, box_b, n_training_games, "negative")
    mean_a, variance_a, std_dev_a = control_experiment(box_a, box_b, n_control_games)
    print("\nЗадание 4.2 - Наказание:")
    print(f"Средний выигрыш игрока A: {mean_a}")
    print(f"Дисперсия: {variance_a}")
    print(f"Среднее квадратичное отклонение: {std_dev_a}")
    print(f"Шары: {box_a}")

    # Задание 4.3 - Динамические вероятности для обоих игроков
    box_a = {'red': 1000, 'blue': 1000}
    box_b = {'red': 1000, 'blue': 1000}
    for _ in range(n_training_games):
        a_prob = box_a['blue'] / sum(box_a.values())
        b_prob = box_b['blue'] / sum(box_b.values())
        row = 0 if random.random() < a_prob else 1
        column = 0 if random.random() < b_prob else 1
        result = matrix[row][column]
        update_box(box_a, 'red' if row == 0 else 'blue', result)
        update_box(box_b, 'red' if column == 0 else 'blue', -result)

    mean_a, variance_a, std_dev_a = control_experiment(box_a, box_b, n_control_games)
    print("\nЗадание 4.3 - Динамические вероятности:")
    print(f"Средний выигрыш игрока A: {mean_a}")
    print(f"Дисперсия: {variance_a}")
    print(f"Среднее квадратичное отклонение: {std_dev_a}")
    print(f"Шары игрока A: {box_a}")
    print(f"Шары игрока B: {box_b}")


if __name__ == '__main__':
    main()